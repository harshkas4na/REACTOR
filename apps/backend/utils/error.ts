// src/utils/errors.ts

export class BaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class ValidationError extends BaseError {}
export class CompilationError extends BaseError {}
export class GeneratorError extends BaseError {}
export class ProtocolVerificationError extends BaseError {}