import { FC } from 'react';
import {
  IconButton,
  useColorMode,
  Tooltip,
} from '@chakra-ui/react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export const ThemeSwitcher: FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Tooltip label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton
        aria-label="Toggle theme"
        icon={colorMode === 'light' ? <MoonIcon width={20} /> : <SunIcon width={20} />}
        onClick={toggleColorMode}
        variant="ghost"
        _hover={{ bg: 'gray.100' }}
        suppressHydrationWarning
      />
    </Tooltip>
  );
};
