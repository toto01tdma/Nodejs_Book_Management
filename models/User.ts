export interface IUser {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
}

export interface IUserCreate {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IUserResponse {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
}

export interface IAuthResponse {
  success: boolean;
  message: string;
  user?: IUserResponse;
  token?: string;
}

export interface IJWTPayload {
  userId: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
} 