const { execSync } = require('child_process')
const path = require('path')

exports.default = async function (context) {
  if (process.platform !== 'darwin') return

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  )
  const script = path.join(__dirname, 'codesign-mac.sh')

  console.log(`[afterPack] Ad-hoc signing ${appPath}`)
  execSync(`bash "${script}" "${appPath}"`, { stdio: 'inherit' })
}
