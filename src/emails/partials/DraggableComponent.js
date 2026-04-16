import React from 'react';
import { Button, Text, Image, Heading, Divider } from '@chakra-ui/react';
import { AddIcon, AttachmentIcon, ChevronDownIcon, DragHandleIcon, ExternalLinkIcon, HamburgerIcon, InfoIcon, MinusIcon, RepeatIcon, SearchIcon, StarIcon } from '@chakra-ui/icons';
import { useDrag } from 'react-dnd';
import { COMPONENT_TYPES } from './componentTypes';

const CodeBadge = ({ label, color }) => (
  <Text fontSize="xs" fontWeight="bold" color={color} letterSpacing="0.08em">
    {label}
  </Text>
);

// Draggable Component
const DraggableComponent = ({ definition }) => {
  const type = definition?.type;
  const title = definition?.title || '';

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
        return <ExternalLinkIcon boxSize={6} color="purple.500" />;
      case COMPONENT_TYPES.SOCIAL_LINK:
        return <AttachmentIcon boxSize={6} color="blue.500" />;
      case COMPONENT_TYPES.SOCIAL_ICONS:
        return <RepeatIcon boxSize={6} color="blue.500" />;
      case COMPONENT_TYPES.HEADING:
        return <Heading size="sm" color="orange.500">H</Heading>; // Icon for Heading
      case COMPONENT_TYPES.HR:
        return <Divider borderColor="gray.500" borderWidth={2} />; // Icon for Horizontal Rule
      case COMPONENT_TYPES.PARAGRAPH:
        return <Text fontSize="lg" fontWeight="bold" color="green.500">P</Text>; // Icon for Paragraph
      case COMPONENT_TYPES.ORDERED_LIST:
        return <Text fontSize="lg" fontWeight="bold" color="orange.700">1.</Text>;
      case COMPONENT_TYPES.UNORDERED_LIST:
        return <Text fontSize="lg" fontWeight="bold" color="gray.500">≡</Text>;
      case COMPONENT_TYPES.HEADER_1:
        return <Heading size="lg" color="blue.500">H1</Heading>; // Icon for H1
      case COMPONENT_TYPES.HEADER_2:
        return <Heading size="md" color="green.500">H2</Heading>; // Icon for H2
      case COMPONENT_TYPES.HEADER_3:
        return <Heading size="sm" color="orange.500">H3</Heading>; // Icon for H3
      case COMPONENT_TYPES.VIDEO:
        return <ChevronDownIcon boxSize={6} color="red.500" transform="rotate(-90deg)" />;
      case COMPONENT_TYPES.TABLE:
        return <DragHandleIcon boxSize={6} color="purple.500" transform="rotate(90deg)" />;
      case COMPONENT_TYPES.SPACE:
        return <MinusIcon boxSize={6} color="gray.500" />;
      case COMPONENT_TYPES.ICON:
        return <StarIcon boxSize={6} color="yellow.500" />;
      case COMPONENT_TYPES.HTML:
        return <CodeBadge color="orange.500" label="<>" />;
      case COMPONENT_TYPES.MENU:
        return <HamburgerIcon boxSize={6} color="teal.500" />;
      case COMPONENT_TYPES.DIV:
        return <CodeBadge color="cyan.500" label="DIV" />;
      case COMPONENT_TYPES.SPAN:
        return <CodeBadge color="pink.500" label="SPAN" />;
      case COMPONENT_TYPES.NAV:
        return <SearchIcon boxSize={5} color="blue.400" />;
      case COMPONENT_TYPES.HEADER:
        return <CodeBadge color="orange.400" label="HDR" />;
      case COMPONENT_TYPES.FOOTER:
        return <CodeBadge color="gray.500" label="FTR" />;
      case COMPONENT_TYPES.SIDEBAR:
        return <CodeBadge color="purple.400" label="SB" />;
      case COMPONENT_TYPES.BANNER:
        return <InfoIcon boxSize={6} color="red.400" />;
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
      case COMPONENT_TYPES.DIV:
        return "Div";
      case COMPONENT_TYPES.SPAN:
        return "Span";
      case COMPONENT_TYPES.NAV:
        return "Navbar";
      case COMPONENT_TYPES.HEADER:
        return "Header";
      case COMPONENT_TYPES.FOOTER:
        return "Footer";
      case COMPONENT_TYPES.SIDEBAR:
        return "Sidebar";
      case COMPONENT_TYPES.BANNER:
        return "Banner/Hero";
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
      title={title || getTitle()} // Added title for hover text
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
