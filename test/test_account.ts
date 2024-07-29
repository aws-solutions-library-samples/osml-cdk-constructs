/*
 * Copyright 2024 Amazon.com, Inc. or its affiliates.
 */

import { OSMLAccount } from "../lib";

export const test_account: OSMLAccount = {
  id: "123456789012",
  prodLike: true,
  region: "us-west-2"
};

export const test_special_account: OSMLAccount = {
  id: "123456789012",
  prodLike: true,
  region: "us-isob-east-1",
  isAdc: true
};
