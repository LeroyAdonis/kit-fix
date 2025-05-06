const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/contact", async (req, res) => {
  const { name, email, phone, service, message } = req.body;

  // Set up your Afrihost SMTP transport
  const transporter = nodemailer.createTransport({
    host: "mail.kitfix.co.za",
    port: 465,
    secure: true,
    auth: {
      user: "info@kitfix.co.za",
      pass: "AriZ@hZ@y101"
    }
  });

  try {
    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: "info@kitfix.co.za",
      subject: `Contact Form: ${service || "General Inquiry"}`,
      text: `
Name: ${name}
Email: ${email}
Phone: ${phone || "N/A"}
Service: ${service || "N/A"}
Message: ${message}
      `,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Service:</strong> ${service || "N/A"}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
