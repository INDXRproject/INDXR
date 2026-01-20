import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"

export default function LibraryPage() {
  return (
    <div className="space-y-8"> 
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Library</h1>
            <div className="flex gap-2">
                 <div className="relative w-64">
                    <div className="absolute left-2.5 top-2.5 text-zinc-500">
                        <Search className="h-4 w-4" />
                    </div>
                     <Input 
                        placeholder="Search transcripts..." 
                        className="pl-9 bg-zinc-900 border-zinc-800 text-white h-9"
                     />
                 </div>
            </div>
        </div>


        <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <Table>
                <TableHeader className="bg-zinc-900">
                    <TableRow className="border-zinc-800 hover:bg-zinc-900">
                        <TableHead className="text-zinc-400">Title</TableHead>
                        <TableHead className="text-zinc-400">Duration</TableHead>
                        <TableHead className="text-zinc-400">Date</TableHead>
                        <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                        <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                            No transcripts found.
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

    </div>
  )
}
