import { FC } from 'react';
import {
  InputGroup,
  InputLeftElement,
  Input,
  Box,
} from '@chakra-ui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export const SearchBar: FC = () => {
  return (
    <Box w={{ base: 'full', md: '400px' }}>
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <MagnifyingGlassIcon width={20} color="gray" />
        </InputLeftElement>
        <Input
          placeholder="Search tickets, alerts, assets..."
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          _hover={{ borderColor: 'gray.300' }}
          _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 1px purple.500' }}
        />
      </InputGroup>
    </Box>
  );
};
