/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

/**
 * A type alias representing a generic configuration object.
 */
export type ConfigType = { [key: string]: unknown };

/**
 * A base class for configuration objects.
 *
 * This class provides a common implementation for initializing configuration objects
 * from a provided configuration object. It uses the `Object.assign` method to copy
 * properties from the provided configuration object to the instance, allowing for
 * easy extension by specific configuration classes.
 *
 * @example
 * // Define a specific configuration class by extending BaseConfig
 * class MyConfig extends BaseConfig {
 *   public someProperty: string;
 *   public anotherProperty: number;
 *
 *   constructor(config: ConfigType = {}) {
 *     super(config);
 *     this.someProperty = this.someProperty ?? "default value";
 *     this.anotherProperty = this.anotherProperty ?? 42;
 *   }
 * }
 *
 * // Create an instance of the specific configuration class
 * const config = new MyConfig({ someProperty: "custom value" });
 * console.log(config.someProperty); // Output: "custom value"
 * console.log(config.anotherProperty); // Output: 42
 */
export class BaseConfig {
  /**
   * Creates an instance of BaseConfig.
   *
   * @param config - A configuration object to initialize the instance properties.
   */
  constructor(config: ConfigType = {}) {
    Object.assign(this, config);
  }
}
