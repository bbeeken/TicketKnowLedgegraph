import { FC } from 'react';
import {
  Box,
  VStack,
  HStack,
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react';

interface LoadingStateProps {
  type?: 'dashboard' | 'table' | 'cards' | 'form' | 'detail';
  count?: number;
}

export const LoadingState: FC<LoadingStateProps> = ({ type = 'cards', count = 3 }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  if (type === 'dashboard') {
    return (
      <VStack spacing={8} align="stretch">
        {/* Header skeleton */}
        <Box>
          <Skeleton height="40px" width="300px" mb={6} />
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Box
                key={i}
                bg={cardBg}
                borderRadius="2xl"
                p={6}
                shadow="xl"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <HStack justify="space-between" mb={4}>
                  <SkeletonCircle size="12" />
                </HStack>
                <VStack align="start" spacing={2}>
                  <Skeleton height="16px" width="80%" />
                  <Skeleton height="32px" width="60%" />
                  <Skeleton height="12px" width="100%" />
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* Secondary content skeleton */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Box
              key={i}
              bg={cardBg}
              borderRadius="2xl"
              p={6}
              shadow="xl"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <Skeleton height="24px" width="50%" mb={4} />
              <VStack spacing={3}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <Box key={j} w="full">
                    <HStack justify="space-between" mb={2}>
                      <Skeleton height="14px" width="40%" />
                      <Skeleton height="14px" width="20%" />
                    </HStack>
                    <Skeleton height="8px" width="100%" />
                  </Box>
                ))}
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    );
  }

  if (type === 'table') {
    return (
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Skeleton height="24px" width="200px" />
          <Skeleton height="40px" width="120px" />
        </HStack>
        <Box
          bg={cardBg}
          borderRadius="xl"
          p={4}
          shadow="lg"
          borderWidth="1px"
          borderColor={borderColor}
        >
          {/* Table header */}
          <HStack spacing={4} p={3} borderBottomWidth="1px" borderColor={borderColor}>
            <Skeleton height="16px" width="30%" />
            <Skeleton height="16px" width="20%" />
            <Skeleton height="16px" width="15%" />
            <Skeleton height="16px" width="25%" />
            <Skeleton height="16px" width="10%" />
          </HStack>
          
          {/* Table rows */}
          {Array.from({ length: count }).map((_, i) => (
            <HStack key={i} spacing={4} p={3} borderBottomWidth="1px" borderColor={borderColor}>
              <SkeletonText noOfLines={1} width="30%" />
              <SkeletonText noOfLines={1} width="20%" />
              <Skeleton height="20px" width="60px" />
              <SkeletonText noOfLines={1} width="25%" />
              <SkeletonCircle size="8" />
            </HStack>
          ))}
        </Box>
      </VStack>
    );
  }

  if (type === 'form') {
    return (
      <Box
        bg={cardBg}
        borderRadius="xl"
        p={6}
        shadow="lg"
        borderWidth="1px"
        borderColor={borderColor}
        maxW="md"
        mx="auto"
      >
        <Skeleton height="32px" width="60%" mb={6} />
        <VStack spacing={4} align="stretch">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i}>
              <Skeleton height="16px" width="30%" mb={2} />
              <Skeleton height="40px" width="100%" />
            </Box>
          ))}
          <HStack spacing={3} pt={4}>
            <Skeleton height="40px" width="100px" />
            <Skeleton height="40px" width="80px" />
          </HStack>
        </VStack>
      </Box>
    );
  }

  if (type === 'detail') {
    return (
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Skeleton height="36px" width="70%" mb={2} />
          <HStack spacing={2}>
            <Skeleton height="24px" width="80px" />
            <Skeleton height="24px" width="60px" />
            <Skeleton height="24px" width="100px" />
          </HStack>
        </Box>

        {/* Content sections */}
        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
          <Box gridColumn={{ base: 1, lg: "1 / 3" }}>
            <Box
              bg={cardBg}
              borderRadius="xl"
              p={6}
              shadow="lg"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <Skeleton height="24px" width="40%" mb={4} />
              <SkeletonText noOfLines={6} spacing={3} />
            </Box>
          </Box>
          
          <VStack spacing={4}>
            <Box
              bg={cardBg}
              borderRadius="xl"
              p={4}
              shadow="lg"
              borderWidth="1px"
              borderColor={borderColor}
              w="full"
            >
              <Skeleton height="20px" width="50%" mb={3} />
              <VStack spacing={2} align="stretch">
                {Array.from({ length: 4 }).map((_, i) => (
                  <HStack key={i} justify="space-between">
                    <Skeleton height="14px" width="40%" />
                    <Skeleton height="14px" width="30%" />
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        </SimpleGrid>
      </VStack>
    );
  }

  // Default: cards
  return (
    <VStack spacing={6} align="stretch">
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          bg={cardBg}
          borderRadius="xl"
          p={6}
          shadow="lg"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <HStack justify="space-between" mb={4}>
            <HStack spacing={3}>
              <SkeletonCircle size="10" />
              <VStack align="start" spacing={1}>
                <Skeleton height="16px" width="200px" />
                <Skeleton height="12px" width="150px" />
              </VStack>
            </HStack>
            <Skeleton height="24px" width="60px" />
          </HStack>
          <SkeletonText noOfLines={2} spacing={2} />
        </Box>
      ))}
    </VStack>
  );
};
