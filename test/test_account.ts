/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { OSMLAccount } from "../lib";

export const test_account: OSMLAccount = {
  id: "123456789012",
  name: "test",
  prodLike: true,
  region: "us-west-2",
  deployModelRunner: true,
  deployTileServer: true,
  deployDataIntake: true,
  enableAuths: true
};

export const test_special_account: OSMLAccount = {
  id: "123456789012",
  name: "test",
  prodLike: true,
  region: "us-isob-east-1",
  isAdc: true,
  deployModelRunner: true,
  deployTileServer: true,
  deployDataIntake: true
};
