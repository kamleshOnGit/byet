// email/EmailList.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Section, Text } from '@react-email/components'; // Importing react-email components

const EmailList = () => {
  // Example email templates
  const emailTemplates = [
    {
      id: 1,
      name: 'Welcome Email',
      template: (
        <Section>
          <Text>Welcome to our service!</Text>
          <Button href='https://example.com'>Get Started</Button>
        </Section>
      ),
    },
    {
      id: 2,
      name: 'Password Reset Email',
      template: (
        <Section>
          <Text>Click below to reset your password</Text>
          <Button href='https://example.com/reset'>Reset Password</Button>
        </Section>
      ),
    },
  ];

  return (
    <div>
      <h2>Email Templates</h2>
      <ul>
        {emailTemplates.map((template) => (
          <li key={template.id}>
            <h3>{template.name}</h3>
            {/* Render the email template preview using react-email components */}
            <div
              style={{
                border: '1px solid #ccc',
                padding: '10px',
                marginBottom: '20px',
              }}
            >
              {template.template}
            </div>
          </li>
        ))}
      </ul>
      <Link to='/create'>Create New Template</Link>
    </div>
  );
};

export default EmailList;
