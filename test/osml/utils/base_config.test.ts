/*
 * Copyright 2025 Amazon.com, Inc. or its affiliates.
 */

import { BaseConfig, ConfigType } from "../../../lib";

describe("BaseConfig Class Tests", () => {
  it("should initialize properties from the provided config object", () => {
    const config: ConfigType = {
      someProperty: "custom value",
      anotherProperty: 42
    };

    const baseConfig = new BaseConfig(config);

    expect((baseConfig as never)["someProperty"]).toBe("custom value");
    expect((baseConfig as never)["anotherProperty"]).toBe(42);
  });

  it("should not override properties if they are not provided in config", () => {
    class MyConfig extends BaseConfig {
      public someProperty: string;
      public anotherProperty: number;

      constructor(config: ConfigType = {}) {
        super(config);
        this.someProperty = this.someProperty ?? "default value";
        this.anotherProperty = this.anotherProperty ?? 100;
      }
    }

    const configInstance = new MyConfig();

    expect(configInstance.someProperty).toBe("default value");
    expect(configInstance.anotherProperty).toBe(100);
  });

  it("should override default values if provided in config", () => {
    class MyConfig extends BaseConfig {
      public someProperty: string;
      public anotherProperty: number;

      constructor(config: ConfigType = {}) {
        super(config);
        this.someProperty = this.someProperty ?? "default value";
        this.anotherProperty = this.anotherProperty ?? 100;
      }
    }

    const configInstance = new MyConfig({
      someProperty: "custom",
      anotherProperty: 50
    });

    expect(configInstance.someProperty).toBe("custom");
    expect(configInstance.anotherProperty).toBe(50);
  });

  it("should handle an empty configuration object gracefully", () => {
    const baseConfig = new BaseConfig();
    expect(baseConfig).toBeDefined();
  });

  it("should allow additional properties to be dynamically assigned", () => {
    const config: ConfigType = { newProperty: "new value" };
    const baseConfig = new BaseConfig(config);

    expect((baseConfig as never)["newProperty"]).toBe("new value");
  });
});
