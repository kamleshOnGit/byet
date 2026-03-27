import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Text, VStack } from '@chakra-ui/react';
import { AddIcon, EditIcon } from '@chakra-ui/icons';
import { parseHtmlToSections } from './utils/htmlParser';

const EmailList = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const handleCreate = () => {
    navigate('/create');
  };

  const handleEditClick = () => {
    if (fileRef.current) fileRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedSections = parseHtmlToSections(text);
      if (!importedSections) return;

      navigate('/create', {
        state: {
          importedSections,
        },
      });
    } catch (err) {
      console.error('Failed to read uploaded file:', err);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Box minH="calc(100vh - 72px)" display="flex" alignItems="center" justifyContent="center" p={8}>
      <VStack spacing={6} align="stretch" w="320px">
        <Button
          onClick={handleCreate}
          leftIcon={<AddIcon />}
          colorScheme="teal"
          size="lg"
          justifyContent="flex-start"
          h="56px"
        >
          Create
        </Button>

        <Button
          onClick={handleEditClick}
          leftIcon={<EditIcon />}
          variant="outline"
          colorScheme="teal"
          size="lg"
          justifyContent="flex-start"
          h="56px"
        >
          Edit
        </Button>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Upload an HTML email template or signature to edit and download.
        </Text>

        <input
          ref={fileRef}
          type="file"
          accept=".html,text/html"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </VStack>
    </Box>
  );
};

export default EmailList;
