import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  ButtonGroup,
  IconButton,
  Textarea,
  useColorModeValue,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody
} from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  CodeBracketIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter description...",
  readOnly = false,
  minHeight = "200px"
}) => {
  const [activeTab, setActiveTab] = useState(0); // 0 = edit, 1 = preview
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textPrimary = useColorModeValue('gray.900', 'white');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const toolbarBg = useColorModeValue('gray.50', 'gray.700');
  const codeBg = useColorModeValue('gray.100', 'gray.700');
  const hoverBg = useColorModeValue('gray.100', 'gray.600');

  const insertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
    if (!textareaRef) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end);
    
    onChange(newText);
    
    // Set cursor position after insertion
    setTimeout(() => {
      if (textareaRef) {
        const newCursorPos = start + before.length + textToInsert.length;
        textareaRef.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.focus();
      }
    }, 0);
  };

  const formatButtons = [
    { icon: BoldIcon, label: 'Bold', before: '**', after: '**', placeholder: 'bold text' },
    { icon: ItalicIcon, label: 'Italic', before: '*', after: '*', placeholder: 'italic text' },
    { icon: LinkIcon, label: 'Link', before: '[', after: '](url)', placeholder: 'link text' },
    { icon: ListBulletIcon, label: 'Bullet List', before: '- ', after: '', placeholder: 'list item' },
    { icon: CodeBracketIcon, label: 'Code', before: '`', after: '`', placeholder: 'code' },
  ];

  if (readOnly) {
    return (
      <Card bg={bg} borderColor={borderColor} minHeight={minHeight}>
        <CardBody>
          <Box className="markdown-content">
            <ReactMarkdown
              components={{
                p: ({ children }) => <Text mb={2} color={textPrimary}>{children}</Text>,
                strong: ({ children }) => <Text as="strong" fontWeight="bold" color={textPrimary}>{children}</Text>,
                em: ({ children }) => <Text as="em" fontStyle="italic" color={textPrimary}>{children}</Text>,
                ul: ({ children }) => <Box as="ul" ml={4} mb={2} color={textPrimary}>{children}</Box>,
                li: ({ children }) => <Text as="li" mb={1} color={textPrimary}>{children}</Text>,
                code: ({ children }) => (
                  <Text as="code" bg={codeBg} px={1} borderRadius="md" fontFamily="mono" fontSize="sm">
                    {children}
                  </Text>
                ),
                a: ({ children, href }) => (
                  <Text as="a" href={href} color="blue.500" textDecoration="underline" _hover={{ color: 'blue.600' }}>
                    {children}
                  </Text>
                ),
              }}
            >
              {value || 'No description provided'}
            </ReactMarkdown>
          </Box>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card bg={bg} borderColor={borderColor} minHeight={minHeight}>
      <VStack spacing={0} align="stretch">
        {/* Toolbar */}
        <Box bg={toolbarBg} borderTopRadius="md" borderBottom="1px" borderColor={borderColor} p={2}>
          <HStack justify="space-between">
            <ButtonGroup size="sm" isAttached variant="outline">
              {formatButtons.map((btn, index) => (
                <IconButton
                  key={index}
                  aria-label={btn.label}
                  icon={<btn.icon style={{ width: '16px', height: '16px' }} />}
                  onClick={() => insertMarkdown(btn.before, btn.after, btn.placeholder)}
                  _hover={{ bg: hoverBg }}
                />
              ))}
            </ButtonGroup>

            <ButtonGroup size="sm" isAttached variant="outline">
              <Button
                leftIcon={<PencilIcon style={{ width: '16px', height: '16px' }} />}
                isActive={activeTab === 0}
                onClick={() => setActiveTab(0)}
                _hover={{ bg: hoverBg }}
              >
                Edit
              </Button>
              <Button
                leftIcon={<EyeIcon style={{ width: '16px', height: '16px' }} />}
                isActive={activeTab === 1}
                onClick={() => setActiveTab(1)}
                _hover={{ bg: hoverBg }}
              >
                Preview
              </Button>
            </ButtonGroup>
          </HStack>
        </Box>

        {/* Content Area */}
        <CardBody minHeight={minHeight}>
          {activeTab === 0 ? (
            <Textarea
              ref={setTextareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              border="none"
              resize="none"
              minHeight={minHeight}
              _focus={{ boxShadow: 'none' }}
              fontFamily="mono"
              fontSize="sm"
            />
          ) : (
            <Box className="markdown-content" minHeight={minHeight}>
              <ReactMarkdown
                components={{
                  p: ({ children }) => <Text mb={2} color={textPrimary}>{children}</Text>,
                  strong: ({ children }) => <Text as="strong" fontWeight="bold" color={textPrimary}>{children}</Text>,
                  em: ({ children }) => <Text as="em" fontStyle="italic" color={textPrimary}>{children}</Text>,
                  ul: ({ children }) => <Box as="ul" ml={4} mb={2} color={textPrimary}>{children}</Box>,
                  li: ({ children }) => <Text as="li" mb={1} color={textPrimary}>{children}</Text>,
                  code: ({ children }) => (
                    <Text as="code" bg={codeBg} px={1} borderRadius="md" fontFamily="mono" fontSize="sm">
                      {children}
                    </Text>
                  ),
                  a: ({ children, href }) => (
                    <Text as="a" href={href} color="blue.500" textDecoration="underline" _hover={{ color: 'blue.600' }}>
                      {children}
                    </Text>
                  ),
                }}
              >
                {value || '*No description provided*'}
              </ReactMarkdown>
            </Box>
          )}
        </CardBody>

        {/* Help Text */}
        <Box bg={toolbarBg} borderBottomRadius="md" borderTop="1px" borderColor={borderColor} px={3} py={2}>
          <Text fontSize="xs" color={textSecondary}>
            Use Markdown formatting: **bold**, *italic*, [links](url), `code`, and - bullet lists
          </Text>
        </Box>
      </VStack>
    </Card>
  );
};