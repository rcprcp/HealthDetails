import { useState } from 'react';
import { Badge, Group, Pagination, Paper, Table, Text } from '@mantine/core';
import { formatCell, truncate } from '../format';
import type { TableData } from '../types';

const PAGE_SIZE = 25;

interface DataTableProps {
  data: TableData;
}

export function DataTable({ data }: DataTableProps) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(data.rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const rows = data.rows.slice(start, start + PAGE_SIZE);

  return (
    <Paper withBorder radius="md">
      <Group justify="space-between" align="center" p="md" gap="sm">
        <Group gap="sm">
          <Text fw={600}>Data</Text>
          <Badge variant="light" color="gray">
            {data.columns.length} columns
          </Badge>
        </Group>
        <Text size="xs" c="dimmed">
          Page {currentPage} of {pageCount}
        </Text>
      </Group>

      <div className="table-scroll">
        <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="md" fz="sm">
          <Table.Thead>
            <Table.Tr>
              {data.columns.map((column) => (
                <Table.Th key={column.name} className="column-header">
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                    {column.name}
                  </Text>
                  <Text size="10px" c="dimmed" fw={400}>
                    {column.type}
                    {column.nullable ? '' : ' · not null'}
                  </Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={data.columns.length}>
                  <Text c="dimmed" ta="center" py="lg">
                    No rows yet.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              rows.map((row, rowIndex) => (
                <Table.Tr key={`${data.name}-${start + rowIndex}`}>
                  {data.columns.map((column) => (
                    <Table.Td key={column.name}>
                      <Cell value={row[column.name]} />
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </div>

      {pageCount > 1 ? (
        <Group justify="center" p="md">
          <Pagination value={currentPage} onChange={setPage} total={pageCount} size="sm" />
        </Group>
      ) : null}
    </Paper>
  );
}

function Cell({ value }: { value: unknown }) {
  const text = formatCell(value);
  const isNull = value === null || value === undefined;
  const isStructured = typeof value === 'object' && value !== null;

  return (
    <Text
      size="sm"
      c={isNull ? 'dimmed' : undefined}
      className={isStructured ? 'cell-structured' : undefined}
      title={text.length > 100 ? text : undefined}
    >
      {truncate(text, 100)}
    </Text>
  );
}
