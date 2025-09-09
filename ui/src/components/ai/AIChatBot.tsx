import { FC, useState, useEffect, useRef } from 'react';
import { Box, IconButton, Input, VStack, HStack, Text, Avatar, useColorModeValue } from '@chakra-ui/react';
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Minimal floating AI assistant – calls /api/ai/chat (assumed) and streams simple responses
export const AIChatBot: FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ from: 'user' | 'assistant'; text: string }>>([]);
  const [input, setInput] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages((m) => [...m, { from: 'user', text: userText }]);
    setInput('');
    setOpen(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      if (!res.ok) throw new Error('AI service error');
      const data = await res.json();
      setMessages((m) => [...m, { from: 'assistant', text: data.reply || 'No response' }]);
    } catch (e) {
      setMessages((m) => [...m, { from: 'assistant', text: 'Sorry, AI is unavailable.' }]);
    }
  }

  return (
    <Box position="fixed" right={4} bottom={4} zIndex={1800}>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <IconButton aria-label="Open assistant" icon={<ChatBubbleLeftRightIcon width={20} />} onClick={() => setOpen((s) => !s)} />
      </Box>

      {open && (
        <Box w={{ base: '92vw', md: '420px' }} h={{ base: '60vh', md: '540px' }} bg={bg} boxShadow="lg" borderRadius="lg" overflow="hidden" display="flex" flexDirection="column">
          <HStack px={3} py={2} borderBottomWidth="1px" borderColor="gray.200">
            <Avatar size="sm" name="OpsGraph Assistant" />
            <Text fontWeight="semibold">OpsGraph Assistant</Text>
            <Box flex={1} />
            <IconButton aria-label="Close" icon={<XMarkIcon width={18} />} size="sm" onClick={() => setOpen(false)} />
          </HStack>

          <VStack ref={containerRef} spacing={3} p={3} align="stretch" overflowY="auto" flex={1}>
            {messages.length === 0 && <Text color="gray.500">Ask me about tickets, alerts, or suggest fixes.</Text>}
            {messages.map((m, i) => (
              <Box key={i} alignSelf={m.from === 'user' ? 'flex-end' : 'flex-start'} maxW="85%" bg={m.from === 'user' ? 'brand.500' : 'gray.100'} color={m.from === 'user' ? 'white' : 'inherit'} px={3} py={2} borderRadius="md">
                <Text fontSize="sm">{m.text}</Text>
              </Box>
            ))}
          </VStack>

          <HStack p={3} borderTopWidth="1px" borderColor="gray.200">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the OpsGraph assistant..." onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            <IconButton aria-label="Send" icon={<ChatBubbleLeftRightIcon width={18} />} onClick={send} />
          </HStack>
        </Box>
      )}
    </Box>
  );
};

export default AIChatBot;
