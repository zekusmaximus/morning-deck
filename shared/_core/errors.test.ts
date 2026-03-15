import { describe, expect, it } from "vitest";
import {
  HttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "./errors";

describe("HttpError", () => {
  it("should create an instance of HttpError with correct properties", () => {
    const statusCode = 418;
    const message = "I'm a teapot";
    const error = new HttpError(statusCode, message);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(statusCode);
    expect(error.message).toBe(message);
    expect(error.name).toBe("HttpError");
  });
});

describe("Convenience constructors", () => {
  it("BadRequestError should create a 400 error", () => {
    const msg = "Bad Request";
    const error = BadRequestError(msg);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe(msg);
  });

  it("UnauthorizedError should create a 401 error", () => {
    const msg = "Unauthorized";
    const error = UnauthorizedError(msg);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe(msg);
  });

  it("ForbiddenError should create a 403 error", () => {
    const msg = "Forbidden";
    const error = ForbiddenError(msg);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe(msg);
  });

  it("NotFoundError should create a 404 error", () => {
    const msg = "Not Found";
    const error = NotFoundError(msg);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe(msg);
  });
});
