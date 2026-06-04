interface NoteListProps {
  topNote: string[];
  middleNote: string[];
  baseNote: string[];
}

export default function NoteList({ topNote, middleNote, baseNote }: NoteListProps) {
  return (
    <div className="note-list">
      <div className="note-item">
        <h4>Top Note</h4>
        <p>{topNote.join(', ')}</p>
      </div>
      <div className="note-item">
        <h4>Middle Note</h4>
        <p>{middleNote.join(', ')}</p>
      </div>
      <div className="note-item">
        <h4>Base Note</h4>
        <p>{baseNote.join(', ')}</p>
      </div>
    </div>
  );
}
