const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    secure: false,
    auth: {
        user: "fd50e52c31d0f1",
        pass: "fe549a932044f3",
    },
});

// Function gửi email reset password (cũ)
const sendMail = async (to, url) => {
    const info = await transporter.sendMail({
        from: 'Admin@hahah.com',
        to: to,
        subject: "request resetpassword email",
        text: "click vao day de reset",
        html: "click vao <a href="+url+">day</a> de reset",
    });
    console.log("Message sent:", info.messageId);
};

// Function gửi email tùy chỉnh (mới - dùng cho gửi password)
const sendMailCustom = async (to, subject, htmlContent) => {
    const info = await transporter.sendMail({
        from: 'Admin@hahah.com',
        to: to,
        subject: subject,
        text: "Plain text version",
        html: htmlContent,
    });
    console.log("Message sent:", info.messageId);
    return info;
};

module.exports = {
    sendMail,
    sendMailCustom
}
