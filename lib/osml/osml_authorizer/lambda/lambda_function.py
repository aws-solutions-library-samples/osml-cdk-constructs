# Copyright 2024 Amazon.com, Inc. or its affiliates.

import os
import re
import ssl
from typing import Any, Dict, Union

import jwt
import requests

def lambda_handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """
    Handle authorization for REST API.

    :param event: Lambda event
    :param context: Lambda context

    :return: IAM policy
    """
    print("REST API authorization handler started")

    id_token = get_id_token(event)

    print(id_token)

    if not id_token:
        print("Missing id_token in request. Denying access.")
        print(f"REST API authorization handler completed with 'Deny' for resource {event['methodArn']}")
        return generate_policy(effect="Deny", resource=event["methodArn"])

    authority = os.environ.get("AUTHORITY", "")
    audience = os.environ.get("AUDIENCE", "")

    if jwt_data := id_token_is_valid(id_token=id_token, audience=audience, authority=authority):
        policy = generate_policy(effect="Allow", resource=event["methodArn"], username=jwt_data["sub"])
        policy["context"] = {"username": jwt_data["sub"]}

        print(f"Generated policy: {policy}")
        print("REST API authorization handler completed with 'Allow' for resource")
        return policy

    print("REST API authorization handler completed with 'Deny' for resource")
    return generate_policy(effect="Deny", resource=event["methodArn"])


def generate_policy(*, effect: str, resource: str, username: str = "username") -> Dict[str, Any]:
    """
    Generate IAM policy.

    :param effect: Allow or Deny
    :param resource: ARN of the resource
    :param username: Username to add to the policy

    :return: IAM policy
    """
    policy = {
        "principalId": username,
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [{"Action": "execute-api:Invoke", "Effect": effect, "Resource": resource}],
        },
    }
    return policy


def id_token_is_valid(*, id_token: str, audience: str, authority: str) -> Union[Dict[str, Any], bool]:
    """
    Check whether an ID token is valid and return decoded data.

    :param id_token: ID token to validate
    :param audience: Audience to validate against
    :param authority: Authority to validate against

    :return: Decoded JWT data or False if invalid
    """
    if not jwt.algorithms.has_crypto:
        print("No crypto support for JWT, please install the cryptography dependency")
        return False
    print(f"{authority}/.well-known/openid-configuration")

    # Here we will point to the sponsor bundle if available,
    cert_path = os.getenv("SSL_CERT_FILE", None)
    resp = requests.get(
        f"{authority}/.well-known/openid-configuration",
        verify=cert_path or True,
        timeout=120,
    )
    if resp.status_code != 200:
        print("Could not get OIDC metadata: %s", resp.content)
        return False

    oidc_metadata = resp.json()
    try:
        ctx = ssl.create_default_context()
        if cert_path:
            ctx.load_verify_locations(cert_path)
        jwks_client = jwt.PyJWKClient(oidc_metadata["jwks_uri"], cache_jwk_set=True, lifespan=360, ssl_context=ctx)
        signing_key = jwks_client.get_signing_key_from_jwt(id_token)
        data: dict = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=authority,
            audience=audience,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_iat": True,
                "verify_aud": True,
                "verify_iss": True,
            },
        )
        return data
    except jwt.exceptions.PyJWTError as e:
        print(e)
        return False


def get_id_token(event: dict) -> str:
    """
    Return token from event request headers.

    :param event: lambda event
    :return: Extracts bearer token from authorization header in lambda event.
    """
    # Normalize headers to lowercase
    normalized_headers = { k.lower(): v for k, v in event["headers"].items() }

    # Check for the authorization header in a case-insensitive way
    pattern = r'(?:Bearer\s)?([A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)'
    if "authorization" in normalized_headers:
        auth_token_match = re.match(pattern, normalized_headers["authorization"])
        if auth_token_match:
            return auth_token_match.group(1)
        else:
            raise ValueError("Invalid authorization header format.")
    else:
        raise ValueError("Missing authorization token.")
