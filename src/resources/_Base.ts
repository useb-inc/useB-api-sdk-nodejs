import HTTPMethod from '../constants';
import { UsebAPI } from '../UsebAPI';
import * as _ from 'lodash';
import axios, {
  AxiosRequestConfig,
  AxiosRequestHeaders,
  AxiosResponse,
  AxiosError,
} from 'axios';
import {
  CallAPIMethodOptions,
  MethodSpec,
  UsebAPIResponse,
  UsebAPITokenResponse,
} from '../interfaces';

type PromiseResponse<D = unknown> =
  | UsebAPIResponse<D>
  | UsebAPITokenResponse
  | AxiosError<UsebAPIResponse>;

export class Base {
  protected _host: string;
  constructor(private _apiClass: UsebAPI, private _axiosInstance) {
    this._axiosInstance = axios.create({
      baseURL: this._host,
    });
  }

  get host(): string {
    return this._host;
  }

  /**
   * @description
   * API host url 오버라이딩 함수
   * @param {string} host
   * @returns {Base}
   * @example
   * const usebAPI = new UsebAPI({
   *  clientId: 'your client id',
   *  clientSecret: 'your client secret',
   * });
   * usebAPI.openapi.overrideHost('https://openapi-test.useb.co.kr');
   */
  public overrideHost(host: string): Base {
    this._host = host;
    return this;
  }

  private async _makeHeaders(): Promise<AxiosRequestHeaders> {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'useb-api-nodejs',
    };
    const accessToken = await this._apiClass.getToken();
    if (accessToken) {
      headers['Authorization'] = 'Bearer ' + accessToken.jwt;
    }
    return headers;
  }

  private async _makeRequest<R>(
    method: HTTPMethod,
    url: string,
    params: object,
    extraHeaders: AxiosRequestHeaders,
  ): Promise<PromiseResponse<R>> {
    const axiosConfig: AxiosRequestConfig = {
      url,
      method,
    };

    if (method === HTTPMethod.GET) {
      axiosConfig.params = params;
    } else {
      axiosConfig.data = params;
    }

    if (/\/oauth\//.test(url)) {
      axiosConfig.headers = extraHeaders;
    } else {
      axiosConfig.headers = {
        ...(await this._makeHeaders()),
        ...extraHeaders,
      };
    }

    return this._axiosInstance
      .request(axiosConfig)
      .then((response: AxiosResponse<UsebAPIResponse>) => {
        const { data } = response;
        return Promise.resolve(data);
      })
      .catch((err: AxiosError<UsebAPIResponse>) => {
        return Promise.reject(err.response);
      });
  }

  /**
   * @description
   * API 호출을 위한 url 생성 함수
   * @param {string[]} params
   * @returns {string}
   */
  private _makeUrl(path: string[]): string {
    // regex replace leading and trailing slash
    return path.map((s) => s.replace(/(^\/|\/$)/g, '')).join('/');
  }

  protected callAPIMethod<P extends object, R = Record<string, unknown>>(
    spec: MethodSpec,
  ): (options?: CallAPIMethodOptions<P>) => Promise<PromiseResponse<R>> {
    const { path, method, urlParam, requiredParams } = spec;
    const _this = this;

    return function (options?: CallAPIMethodOptions<P>) {
      const { param, headers } = options || {};
      const stack = new Error().stack;
      const apiParams: string[] = [_this._host];

      // urlParam이 정의되어있으나 param에 없으면 에러
      if (urlParam) {
        if (!_.has(param, urlParam)) {
          return new Promise(function (resolve, reject) {
            reject(new Error('Param missing: ' + urlParam));
          });
        }
        _.entries(param).forEach(([key, value]) => {
          if (key === urlParam) {
            const replacedPath = path.replace(`:${key}`, value);
            apiParams.push(replacedPath);
          }
        });
        delete param[urlParam];
      } else {
        apiParams.push(path);
      }

      for (let i = 0; i < requiredParams?.length || 0; i++) {
        console.log(param);
        console.log(requiredParams[i]);
        if (!_.has(param, requiredParams[i])) {
          return new Promise(function (resolve, reject) {
            reject(new Error('Param missing: ' + requiredParams[i]));
          });
        }
      }

      const API_BASE = _this._makeUrl(apiParams);

      return new Promise<PromiseResponse<R>>(function (resolve, reject) {
        _this
          ._makeRequest<R>(method, API_BASE, param, headers)
          .then((data) => resolve(data))
          .catch((error) => {
            if (error.stack && stack) {
              error.stack +=
                '\nFrom previous event: ' + stack.substr(stack.indexOf('\n'));
            }
            reject(error);
          });
      });
    };
  }
}
export default Base;
