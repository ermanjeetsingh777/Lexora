export interface APIResponseModel<T> {
    success: boolean;
    message: string;
    data: T;
    errors?: any;
}