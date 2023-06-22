import { RemovalPolicy } from "aws-cdk-lib";
import { Attribute, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
export interface OSMLTableProps {
    tableName: string;
    partitionKey: Attribute;
    removalPolicy: RemovalPolicy;
    sortKey?: Attribute;
    ttlAttribute?: string;
}
export declare class OSMLTable extends Construct {
    table: Table;
    /**
     * Creates an OSML DDB Table.
     * @param scope the scope/stack in which to define this construct.
     * @param id the id of this construct within the current scope.
     * @param props the properties of this construct.
     * @returns the OSMLTable construct.
     */
    constructor(scope: Construct, id: string, props: OSMLTableProps);
}
