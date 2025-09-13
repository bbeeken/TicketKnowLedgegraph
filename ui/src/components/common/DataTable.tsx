import { FC, useState, useMemo } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Flex,
  IconButton,
  Button,
  Input,
  Select,
  HStack,
  VStack,
  Text,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Checkbox,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pageSize?: number;
  searchable?: boolean;
  selectable?: boolean;
  exportable?: boolean;
  onRowSelect?: (selectedRows: T[]) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export const DataTable: FC<DataTableProps> = ({
  data,
  columns,
  loading = false,
  pageSize = 10,
  searchable = true,
  selectable = false,
  exportable = false,
  onRowSelect,
  onRowClick,
  emptyMessage = 'No data available',
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map(col => col.key))
  );

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply global filter
    if (globalFilter) {
      filtered = filtered.filter(row =>
        columns.some(col => {
          const value = row[col.key];
          return value?.toString().toLowerCase().includes(globalFilter.toLowerCase());
        })
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(row =>
          row[key]?.toString().toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortKey) {
      filtered.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        
        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;
        
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [data, globalFilter, filters, sortKey, sortDirection, columns]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
    
    if (onRowSelect) {
      const selectedData = Array.from(newSelected).map(i => paginatedData[i]);
      onRowSelect(selectedData);
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onRowSelect?.([]);
    } else {
      const allIndices = new Set(paginatedData.map((_, i) => i));
      setSelectedRows(allIndices);
      onRowSelect?.(paginatedData);
    }
  };

  const exportData = () => {
    const csv = [
      columns.filter(col => visibleColumns.has(col.key)).map(col => col.label).join(','),
      ...processedData.map(row =>
        columns
          .filter(col => visibleColumns.has(col.key))
          .map(col => row[col.key])
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return null;
    return sortDirection === 'asc' ? 
      <ChevronUpIcon width={16} /> : 
      <ChevronDownIcon width={16} />;
  };

  const visibleColumnsArray = columns.filter(col => visibleColumns.has(col.key));

  return (
    <VStack spacing={4} align="stretch">
      {/* Controls */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
        <HStack spacing={4}>
          {searchable && (
            <Input
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setCurrentPage(1);
              }}
              maxW="300px"
            />
          )}
          
          <Text fontSize="sm" color="gray.500">
            {processedData.length} total items
          </Text>
        </HStack>

        <HStack spacing={2}>
          {/* Column visibility */}
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<AdjustmentsHorizontalIcon width={20} />}
              aria-label="Column settings"
              variant="outline"
              size="sm"
            />
            <MenuList>
              {columns.map(col => (
                <MenuItem key={col.key} closeOnSelect={false}>
                  <Checkbox
                    isChecked={visibleColumns.has(col.key)}
                    onChange={() => {
                      const newVisible = new Set(visibleColumns);
                      if (newVisible.has(col.key)) {
                        newVisible.delete(col.key);
                      } else {
                        newVisible.add(col.key);
                      }
                      setVisibleColumns(newVisible);
                    }}
                  >
                    {col.label}
                  </Checkbox>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* Export */}
          {exportable && (
            <Tooltip label="Export to CSV">
              <IconButton
                icon={<ArrowDownTrayIcon width={20} />}
                aria-label="Export data"
                variant="outline"
                size="sm"
                onClick={exportData}
              />
            </Tooltip>
          )}
        </HStack>
      </Flex>

      {/* Table */}
      <Box
        bg={bg}
        borderRadius="md"
        borderWidth="1px"
        borderColor={borderColor}
        overflow="auto"
      >
        <Table variant="simple">
          <Thead>
            <Tr>
              {selectable && (
                <Th w="50px">
                  <Checkbox
                    isChecked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    isIndeterminate={selectedRows.size > 0 && selectedRows.size < paginatedData.length}
                    onChange={handleSelectAll}
                  />
                </Th>
              )}
              {visibleColumnsArray.map(col => (
                <Th
                  key={col.key}
                  cursor={col.sortable ? 'pointer' : 'default'}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  _hover={col.sortable ? { bg: hoverBg } : {}}
                  width={col.width}
                  textAlign={col.align || 'left'}
                >
                  <HStack spacing={2} justify={col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start'}>
                    <Text>{col.label}</Text>
                    {col.sortable && getSortIcon(col.key)}
                  </HStack>
                </Th>
              ))}
            </Tr>
            
            {/* Filter row */}
            {visibleColumnsArray.some(col => col.filterable) && (
              <Tr>
                {selectable && <Th />}
                {visibleColumnsArray.map(col => (
                  <Th key={`filter-${col.key}`} py={2}>
                    {col.filterable && (
                      <Input
                        size="sm"
                        placeholder={`Filter ${col.label.toLowerCase()}...`}
                        value={filters[col.key] || ''}
                        onChange={(e) => handleFilter(col.key, e.target.value)}
                      />
                    )}
                  </Th>
                ))}
              </Tr>
            )}
          </Thead>
          
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={visibleColumnsArray.length + (selectable ? 1 : 0)} textAlign="center" py={8}>
                  <Text>Loading...</Text>
                </Td>
              </Tr>
            ) : paginatedData.length === 0 ? (
              <Tr>
                <Td colSpan={visibleColumnsArray.length + (selectable ? 1 : 0)} textAlign="center" py={8}>
                  <Text color="gray.500">{emptyMessage}</Text>
                </Td>
              </Tr>
            ) : (
              paginatedData.map((row, index) => (
                <Tr
                  key={index}
                  bg={selectedRows.has(index) ? selectedBg : 'transparent'}
                  _hover={{ bg: hoverBg }}
                  cursor={onRowClick ? 'pointer' : 'default'}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <Td>
                      <Checkbox
                        isChecked={selectedRows.has(index)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRowSelect(index);
                        }}
                      />
                    </Td>
                  )}
                  {visibleColumnsArray.map(col => (
                    <Td key={col.key} textAlign={col.align || 'left'}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </Td>
                  ))}
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Flex justify="space-between" align="center">
          <HStack>
            <Text fontSize="sm" color="gray.500">
              Showing {startIndex + 1}-{Math.min(startIndex + pageSize, processedData.length)} of {processedData.length}
            </Text>
          </HStack>
          
          <HStack spacing={2}>
            <IconButton
              icon={<ChevronLeftIcon width={20} />}
              aria-label="Previous page"
              size="sm"
              variant="outline"
              isDisabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            />
            
            <HStack spacing={1}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    size="sm"
                    variant={currentPage === page ? 'solid' : 'outline'}
                    colorScheme={currentPage === page ? 'purple' : 'gray'}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </HStack>
            
            <IconButton
              icon={<ChevronRightIcon width={20} />}
              aria-label="Next page"
              size="sm"
              variant="outline"
              isDisabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            />
          </HStack>
        </Flex>
      )}
    </VStack>
  );
};
