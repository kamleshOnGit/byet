import React from 'react';
import { Button, Text, Image, Link, Heading, Divider } from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { useDrag } from 'react-dnd';
import { COMPONENT_TYPES } from './componentTypes';

// Draggable Component
const DraggableComponent = ({ type }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type,
    item: { type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const getIcon = () => {
    switch (type) {
      case COMPONENT_TYPES.BUTTON:
        return <AddIcon boxSize={6} color="teal.500" />; // Icon for Button
      case COMPONENT_TYPES.TEXT:
        return <Text fontSize="lg" fontWeight="bold" color="blue.500">T</Text>; // Icon for Text
      case COMPONENT_TYPES.IMAGE:
        return <Image src="https://dummyimage.com/40x40/cccccc/000000.png" alt="Image Icon" boxSize={8} />; // Icon for Image
      case COMPONENT_TYPES.LINK:
        return <Link fontSize="lg" color="purple.500">🔗</Link>; // Icon for Link
      case COMPONENT_TYPES.SOCIAL_LINK:
        return <Link fontSize="lg" color="blue.500">@</Link>; // Icon for Social Link
      case COMPONENT_TYPES.SOCIAL_ICONS:
        return <Text fontSize="lg" color="blue.500">📱</Text>; // Icon for Social Icons
      case COMPONENT_TYPES.HEADING:
        return <Heading size="sm" color="orange.500">H</Heading>; // Icon for Heading
      case COMPONENT_TYPES.HR:
        return <Divider borderColor="gray.500" borderWidth={2} />; // Icon for Horizontal Rule
      case COMPONENT_TYPES.PARAGRAPH:
        return <Text fontSize="lg" fontWeight="bold" color="green.500">P</Text>; // Icon for Paragraph
      case COMPONENT_TYPES.ORDERED_LIST:
        return <Text fontSize="lg" fontWeight="bold" color="brown.500">1.</Text>; // Icon for Ordered List
      case COMPONENT_TYPES.UNORDERED_LIST:
        return <Text fontSize="lg" fontWeight="bold" color="gray.500">•</Text>; // Icon for Unordered List
      case COMPONENT_TYPES.HEADER_1:
        return <Heading size="lg" color="blue.500">H1</Heading>; // Icon for H1
      case COMPONENT_TYPES.HEADER_2:
        return <Heading size="md" color="green.500">H2</Heading>; // Icon for H2
      case COMPONENT_TYPES.HEADER_3:
        return <Heading size="sm" color="orange.500">H3</Heading>; // Icon for H3
      case COMPONENT_TYPES.VIDEO:
        return <Text fontSize="lg" color="red.500">▶</Text>; // Icon for Video
      case COMPONENT_TYPES.TABLE:
        return <Text fontSize="lg" color="purple.500">▦</Text>; // Icon for Table
      case COMPONENT_TYPES.SPACE:
        return <Text fontSize="lg" color="gray.500">␣</Text>; // Icon for Space
      case COMPONENT_TYPES.ICON:
        return <Text fontSize="lg" color="yellow.500">★</Text>; // Icon for Icon
      case COMPONENT_TYPES.HTML:
        return <Text fontSize="lg" color="orange.500">{'<>'}</Text>; // Icon for HTML
      case COMPONENT_TYPES.MENU:
        return <Text fontSize="lg" color="teal.500">☰</Text>; // Icon for Menu
      default:
        return null; // Remove unknown elements
    }
  };

  const getTitle = () => {
    switch (type) {
      case COMPONENT_TYPES.BUTTON:
        return "Button";
      case COMPONENT_TYPES.TEXT:
        return "Text Block";
      case COMPONENT_TYPES.IMAGE:
        return "Image";
      case COMPONENT_TYPES.LINK:
        return "Link";
      case COMPONENT_TYPES.SOCIAL_LINK:
        return "Social Link";
      case COMPONENT_TYPES.SOCIAL_ICONS:
        return "Social Icons";
      case COMPONENT_TYPES.HEADING:
        return "Heading";
      case COMPONENT_TYPES.HR:
        return "Horizontal Rule";
      case COMPONENT_TYPES.PARAGRAPH:
        return "Paragraph";
      case COMPONENT_TYPES.ORDERED_LIST:
        return "Ordered List";
      case COMPONENT_TYPES.UNORDERED_LIST:
        return "Unordered List";
      case COMPONENT_TYPES.HEADER_1:
        return "Header 1";
      case COMPONENT_TYPES.HEADER_2:
        return "Header 2";
      case COMPONENT_TYPES.HEADER_3:
        return "Header 3";
      case COMPONENT_TYPES.VIDEO:
        return "Video";
      case COMPONENT_TYPES.TABLE:
        return "Table";
      case COMPONENT_TYPES.SPACE:
        return "Space";
      case COMPONENT_TYPES.ICON:
        return "Icon";
      case COMPONENT_TYPES.HTML:
        return "HTML";
      case COMPONENT_TYPES.MENU:
        return "Menu";
      default:
        return ""; // No title for unknown elements
    }
  };

  const icon = getIcon();
  if (!icon) return null; // Skip rendering unknown elements

  return (
    <Button
      ref={drag}
      p={2}
      bg="white"
      rounded="md"
      boxShadow="sm"
      cursor="grab"
      opacity={isDragging ? 0.5 : 1}
      _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
      title={getTitle()} // Added title for hover text
      w="100%" // Responsive width
      h="60px" // Set fixed height
      display="flex"
      justifyContent="center"
      alignItems="center"
      transition="all 0.2s ease"
      border="1px solid"
      borderColor="gray.200"
    >
      {icon}
    </Button>
  );
};

export default DraggableComponent;
