import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@indxr/shared/Table';
import { Badge } from '@indxr/shared/Badge';

export function Default() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Credits</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>How to Build in Public</TableCell>
          <TableCell>48 min</TableCell>
          <TableCell>48</TableCell>
          <TableCell><Badge variant="secondary">Done</Badge></TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Ship It — Episode 12</TableCell>
          <TableCell>32 min</TableCell>
          <TableCell>32</TableCell>
          <TableCell><Badge variant="secondary">Done</Badge></TableCell>
        </TableRow>
        <TableRow>
          <TableCell>The Startup Playbook</TableCell>
          <TableCell>61 min</TableCell>
          <TableCell>61</TableCell>
          <TableCell><Badge variant="outline">Processing</Badge></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export function WithCaption() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead style={{ textAlign: 'right' }}>Credits</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Jul 1</TableCell>
          <TableCell>Transcript extraction</TableCell>
          <TableCell style={{ textAlign: 'right' }}>−48</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Jun 29</TableCell>
          <TableCell>Plan: Plus</TableCell>
          <TableCell style={{ textAlign: 'right' }}>+200</TableCell>
        </TableRow>
      </TableBody>
      <TableCaption>Recent credit transactions</TableCaption>
    </Table>
  );
}
