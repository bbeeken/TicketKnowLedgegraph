import { FC } from 'react';
import { Box } from '@chakra-ui/react';
import { GlobalSearch } from './GlobalSearch';

export const SearchBar: FC = () => {
  return (
    <Box w={{ base: 'full', md: '400px' }}>
      <GlobalSearch />
    </Box>
  );
};
