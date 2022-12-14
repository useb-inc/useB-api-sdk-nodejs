import HTTPMethod from '../HttpMethods';
import { AUTH_BASE_HOST } from '../constants';
import { BaseResponse, DataResponse, None } from '../interfaces';
import Base from './_Base';

interface GetClientSecretParams {
  email: string;
  password: string;
}
interface GetClientSecretResponseData {
  client_id: string;
  client_secret: string;
}
interface TokenResponse extends BaseResponse {
  jwt: string;
  expires_in: string;
}

export class Auth extends Base {
  protected _host = AUTH_BASE_HOST;

  getClientSecret = this.callAPIMethod<
    GetClientSecretParams,
    DataResponse<GetClientSecretResponseData>
  >({
    method: HTTPMethod.POST,
    path: '/oauth/get-client-secret',
    requiredParams: ['email', 'password'],
  });

  token = this.callAPIMethod<None, TokenResponse>({
    method: HTTPMethod.POST,
    path: '/oauth/token',
  });
}
