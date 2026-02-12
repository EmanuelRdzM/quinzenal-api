// src/shared/errors/ApiError.js
export default class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}
