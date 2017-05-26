# letslambda-encrypt

Registering or renewing let's encrypt ssl with AWS Lambda

## Usage

- Adding role and environment variables into project.json
- Deploy function with [apex](https://www.github.com/apex/apex)

```
apex deploy
```

- Invoke function with cloudwatch event or `apex invoke` for fetching SSL

```
apex invoke <<< '{ "domain": "my.superawesome.domain" }'
```

## Variables

- S3_BUCKET, Bucket name for storing let's encrypt files including certificates
- LETSENCRYPT_ACCOUNT_EMAIL, Email address for requesting SSL from let's encrypt
- LETSENCRYPT_SERVER, Let's encrypt environment, choose between "production" and "staging"
- CLOUDFLARE_EMAIL, Cloudflare account email
- CLOUDFLARE_KEY, Cloudflare global api key
- DELAY, Delay time before complete challenge after creating TXT record in DNS (Cloudflare)
- DEBUG, Enable debug mode

## License

ISC
