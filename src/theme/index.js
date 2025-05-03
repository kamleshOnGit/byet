import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  colors: {
    brand: {
      100: '#f7fafc',
      900: '#1a202c',
    },
  },
  components: {
    Button: {
      baseStyle: {
        _hover: {
          bg: 'teal.500',
          color: 'white',
          border: '2px solid',
          borderColor: 'teal.500',
        },
      },
      defaultProps: {
        variant: 'outline',
      },
    },
  },
});

export default theme;