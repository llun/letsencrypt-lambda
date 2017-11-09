const Greenlock = require('greenlock')

const S3Store = require('le-store-s3')
const CloudflareChallenge = require('le-challenge-cloudflare')
const Route53Challenge = require('le-challenge-route53')

const cloudflare = CloudflareChallenge.create({
  email: process.env.CLOUDFLARE_EMAIL,
  key: process.env.CLOUDFLARE_KEY,
  delay: parseInt(process.env.DELAY || "1000", 10)
})

const route53 = Route53Challenge.create({
  debug: true,
  delay: parseInt(process.env.DELAY || "1000", 10)
})

const challenges = {
  'cloudflare': cloudflare,
  'route53': route53
}

const challenge = challenges[process.env.DNS_SERVICE]
if (!challenge) throw new Error(`${process.env.DNS_SERVICE} is not supported`)

const store = S3Store.create({
  S3: { bucketName: process.env.S3_BUCKET },
  debug: process.env.DEBUG
})
const letsencrypt = Greenlock.create({
  server: process.env.LETSENCRYPT_SERVER || Greenlock.stagingServerUrl,
  store,
  renewWithin: 15 * 86400000, // 15 Days
  challenges: {
    'dns-01': challenge
  },
  challengeType: 'dns-01',
  agreeToTerms ({ tosUrl }, callback) {
    callback(null, tosUrl)
  }
})

const email = process.env.LETSENCRYPT_ACCOUNT_EMAIL

exports.handle = (event, context, callback) => {
  const domains = event.domains
  console.log(`requesting ${domains} ssl with account ${email}`)

  if (!domains || !email) {
    return callback(new Error('required domain and email'))
  }

  letsencrypt
    .register({
      domains,
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
