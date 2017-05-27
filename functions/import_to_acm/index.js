const AWS = require('aws-sdk')
const acm = new AWS.ACM()
const s3 = new AWS.S3()

const Bucket = process.env.S3_BUCKET
const promisify = (fn, object) => (function () {
  const args = arguments
  return new Promise((resolve, reject) => {
    const argsWithPromise = Array.prototype.slice.call(args).concat([(error, result) => {
      if (error) return reject(error)
      return resolve(result)
    }])
    fn.apply(object, argsWithPromise)
  })
})

s3.listObjectsV2Async = promisify(s3.listObjectsV2, s3)
s3.getObjectAsync = promisify(s3.getObject, s3)
acm.listCertificatesAsync = promisify(acm.listCertificates, acm)
acm.importCertificateAsync = promisify(acm.importCertificate, acm)

exports.handle = (event, context, callback) => {
  s3.listObjectsV2Async({ Bucket, Delimiter: '/', Prefix: 'configs/live/' })
    .then(data => {
      const prefixes = data.CommonPrefixes
      const domains = prefixes.map(item => ({
        prefix: item.Prefix,
        name: item.Prefix.substring(data.Prefix.length, item.Prefix.length - 1)
      }))
      acm.listCertificatesAsync()
        .then(certificates =>
          certificates.CertificateSummaryList
            .reduce((out, item) => {
              out[item.DomainName] = item
              return out
            }, {})
        )
        .then(acmMap =>
          Promise.all(domains.map(domain =>
            Promise.all([
              acmMap,
              domain,
              s3.getObjectAsync({ Bucket, Key: `${domain.prefix}cert.pem` }),
              s3.getObjectAsync({ Bucket, Key: `${domain.prefix}fullchain.pem` }),
              s3.getObjectAsync({ Bucket, Key: `${domain.prefix}privkey.pem` })
              ])
          ))
        )
        .then(certWithDomains =>
          Promise.all(certWithDomains.map(item => {
            const [acmMap, domain, cert, chain, privkey] = item
            return acm.importCertificateAsync({
              CertificateArn: acmMap[domain.name] && acmMap[domain.name].CertificateArn,
              Certificate: cert.Body,
              PrivateKey: privkey.Body,
              CertificateChain: chain.Body
            })
          }))
        )
        .then(() => {
          console.log('imported')
          callback(null, { ok: true })
        })
    })
    .catch(error => {
      console.error('error', error)
      callback(error)
    })
}

