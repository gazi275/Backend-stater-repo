import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";
import handleZodError from "../../utils/handleZodError";
import ApiError from "../error/ApiErrors";
import handlePrismaValidation from "../../utils/handlePrismaValidation";

const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
};

const GlobalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Something went wrong!";
  let errorSources: { type: string; details?: any }[] = [];

  /* -------------------- ZOD ERROR -------------------- */
  if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources.push({
      type: "ZodValidationError",
      details: simplifiedError.errorDetails,
    });
  }

  /* -------------------- CUSTOM API ERROR -------------------- */
  else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources.push({
      type: "ApiError",
      details: err.message,
    });
  }

  /* -------------------- PRISMA VALIDATION ERROR -------------------- */
  else if (err instanceof Prisma.PrismaClientValidationError) {
    const prismaError = handlePrismaValidation(err.message);
    statusCode = StatusCodes.BAD_REQUEST;
    message = prismaError.message;
    errorSources.push({
      type: "PrismaValidationError",
      details: prismaError.errors,
    });
  }

  /* -------------------- PRISMA INITIALIZATION ERROR -------------------- */
  else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    message =
      "Failed to initialize database connection. Please try again later.";
    errorSources.push({ type: "PrismaInitializationError" });
  }

  /* -------------------- PRISMA RUST PANIC -------------------- */
  else if (err instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    message = "Critical database engine error occurred.";
    errorSources.push({ type: "PrismaRustPanicError" });
  }

  /* -------------------- PRISMA UNKNOWN ERROR -------------------- */
  else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    message = "Unknown database error occurred.";
    errorSources.push({ type: "PrismaUnknownError" });
  }

  /* -------------------- JS ERRORS -------------------- */
  else if (err instanceof SyntaxError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Invalid request syntax.";
    errorSources.push({ type: "SyntaxError" });
  }

  else if (err instanceof TypeError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Invalid data type provided.";
    errorSources.push({ type: "TypeError" });
  }

  else if (err instanceof ReferenceError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Reference error occurred.";
    errorSources.push({ type: "ReferenceError" });
  }

  /* -------------------- FALLBACK -------------------- */
  else {
    errorSources.push({
      type: "UnknownError",
      details: err?.message,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack: config.NODE_ENV === "development" ? err?.stack : undefined,
  });
};

export default GlobalErrorHandler;
