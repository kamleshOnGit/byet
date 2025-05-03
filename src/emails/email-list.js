// email/EmailList.js
import React from 'react';
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';

const EmailList = () => {
  const emailTemplates = [
    {
      id: 1,
      name: 'Welcome Email',
      template: (
        <VStack spacing={4} align="start">
          <Text>Welcome to our service!</Text>
          <Button colorScheme="teal" as="a" href="https://example.com">
            Get Started
          </Button>
        </VStack>
      ),
    },
    {
      id: 2,
      name: 'Password Reset Email',
      template: (
        <VStack spacing={4} align="start">
          <Text>Click below to reset your password</Text>
          <Button colorScheme="teal" as="a" href="https://example.com/reset">
            Reset Password
          </Button>
        </VStack>
      ),
    },
  ];

  return (
    <Box p={4}>
      <Heading as="h2" size="lg" mb={6}>
        Email Templates
      </Heading>
      <VStack spacing={6} align="stretch">
        {emailTemplates.map((template) => (
          <Box
            key={template.id}
            borderWidth="1px"
            borderRadius="lg"
            p={4}
            boxShadow="sm"
          >
            <Heading as="h3" size="md" mb={4}>
              {template.name}
            </Heading>
            {template.template}
          </Box>
        ))}
      </VStack>
    </Box>
  );
};

export default EmailList;
