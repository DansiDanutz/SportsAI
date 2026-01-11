const { generate } = require('otplib');
const secret = process.argv[2] || '5ZIODJX2DXGSUB4IANKX2OI3LXBDTYG7';
const token = generate({ secret: secret });
if (token instanceof Promise) {
  token.then(t => console.log(t)).catch(err => console.error(err));
} else {
  console.log(token);
}
