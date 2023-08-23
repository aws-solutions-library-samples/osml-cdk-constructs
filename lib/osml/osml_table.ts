/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates.
 */

import { RemovalPolicy } from "aws-cdk-lib";
import { Attribute, BillingMode, Table, TableEncryption } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface OSMLTableProps {
  // the name of the table to create
  tableName: string;
  // the partition key of the table - must be of type String
  partitionKey: Attribute;
  //  the removal policy to apply to the table
  removalPolicy: RemovalPolicy;
  // the sort key of the table - must be of type String or Number
  sortKey?: Attribute;
  // the TTL attribute of the table - must be of type String or Number
  ttlAttribute?: string;
}

export class OSMLTable extends Construct {
  public table: Table;

  /**
   * Creates an OSML DDB Table.
   * @param scope the scope/stack in which to define this construct.
   * @param id the id of this construct within the current scope.
   * @param props the properties of this construct.
   * @returns the OSMLTable construct.
   */
  constructor(scope: Construct, id: string, props: OSMLTableProps) {
    super(scope, id);
    this.table = new Table(this, id, {
      tableName: props.tableName,
      partitionKey: props.partitionKey,
      sortKey: props.sortKey,
      pointInTimeRecovery: true,
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.AWS_MANAGED,
      removalPolicy: props.removalPolicy,
      timeToLiveAttribute: props.ttlAttribute
    });
  }
}
