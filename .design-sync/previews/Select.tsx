import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from '@indxr/shared/Select';

export function Default() {
  return (
    <Select defaultValue="en">
      <SelectTrigger style={{ width: 200 }}>
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="nl">Dutch</SelectItem>
        <SelectItem value="de">German</SelectItem>
        <SelectItem value="fr">French</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function Placeholder() {
  return (
    <Select>
      <SelectTrigger style={{ width: 220 }}>
        <SelectValue placeholder="Choose a plan…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="basic">Basic — €5.99</SelectItem>
        <SelectItem value="plus">Plus — €11.99</SelectItem>
        <SelectItem value="pro">Pro — €24.99</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Select defaultValue="srt">
        <SelectTrigger size="sm" style={{ width: 200 }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="srt">Small trigger (.srt)</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="txt">
        <SelectTrigger style={{ width: 200 }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="txt">Default trigger (.txt)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
