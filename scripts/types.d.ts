/**
 * Represents either a successful result with a value or a failure with an error.
 */
declare type Either<Value, Error = unknown> =
	| { success: true; value: Value; error?: never }
	| { success: false; error: Error; value?: never };

declare type PackType = "RP" | "BP";
