export interface ResponseAttributes<T> {
  id: string;
  attributes: T;
}

export interface ResponseData<T> {
  data: ResponseAttributes<T>;
}

export interface ResponseDataArray<T> {
  data: ResponseAttributes<T>[];
}

export interface ResponseTimestamps {
  createdAt: string;
  updatedAt: string;
}
