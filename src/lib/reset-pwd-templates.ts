export function resetPwTemplate(url: string) {
  const html = /* html */`
    <!doctype html>
    <html><head><meta charset="utf-8" />
      <style>
        body{background:#f5f7fa;margin:0;padding:40px 0;font:16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#2f3040;}
        .box{max-width:480px;margin:auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.05);}
        h1{font-size:20px;margin:0 0 16px;text-align:center;}
        .btn{display:block;width:100%;max-width:260px;margin:0 auto;background:#071027;color:#fff;text-align:center;text-decoration:none;font-weight:600;padding:14px 0;border-radius:8px}
        .small{font-size:13px;color:#677285;margin-top:24px;text-align:center}
      </style>
    </head><body>
      <div class="box">
        <h1>Reset your Wealth Pilot password 📬</h1>
        <p>Someone (hopefully you) asked to reset the password for your Wealth Pilot account.</p>
        <p style="text-align:center;">
          <a href="${url}" class="btn" style="color:#ffffff !important;">Choose a new password</a>
        </p>
        <p class="small">If you didn't request this, just ignore this e-mail. The link expires in 60 minutes.</p>
      </div>
    </body></html>
  `.trim();

  const text = `
Reset your Wealth Pilot password 📬

Someone (hopefully you) asked to reset the password for your Wealth Pilot account.

Choose a new password:  ${url}

If you didn't request this, just ignore this e-mail. The link expires in 60 minutes.
  `.trim();

  return { html, text };
}
