import { Box, BoxProps } from '@chakra-ui/react';
import { motion, MotionProps } from 'framer-motion';

// Create a motion box with proper typing
export const MotionBox = motion(Box) as React.ComponentType<Omit<BoxProps, keyof MotionProps> & MotionProps>;
