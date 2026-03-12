const { execFileSync } = require('node:child_process')
const { join } = require('node:path')

module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') {
    return
  }

  const appPath = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', '--timestamp=none', appPath], {
    stdio: 'inherit'
  })
}
