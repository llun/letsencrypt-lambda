const AWS = require('aws-sdk')
const Greenlock = require('greenlock')

const S3Store = require('le-store-s3')
const CloudflareChallenge = require('le-challenge-cloudflare')

const challenge = CloudflareChallenge.create({
  email: process.env.CLOUDFLARE_EMAIL,
  key: process.env.CLOUDFLARE_KEY
})

const store = S3Store.create({
  bucketName: process.env.S3_BUCKET
})

const letsencrypt = Greenlock.create({
  server: process.env.LETSENCRYPT_SERVER || 'staging',
  store,
  challenges: {
    'dns-01': challenge
  },
  challengeType: 'dns-01',
  agreeToTerms (opts, callback) {
    callback(null, opts.tosUrl)
  }
})

const email = process.env.LETSENCRYPT_ACCOUNT_EMAIL

exports.handle = (event, context, callback) => {
  const domain = event.domain

  if (!domain || !email) {
    return callback(new Error('required domain and email'))
  }

  console.log(`requesting ${domain} ssl with account ${email}`)
  letsencrypt
    .register({
      domains: [domain],
      email: email,
      agreeTos: true,
      rsaKeySize: 2048,
      challengeType: 'dns-01'
    })
    .then(() => {
      callback(null, { ok: true })
    })
    .catch(error => callback(error))
}