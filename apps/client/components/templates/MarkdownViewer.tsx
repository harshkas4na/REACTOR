import dynamic from 'next/dynamic';
import type { MDEditorProps } from '@uiw/react-md-editor';

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

interface MarkdownViewerProps {
  content: string;
}

const MarkdownViewer = ({ content }: MarkdownViewerProps) => {
  return (
    <div data-color-mode="dark">
      <MDEditor
        source={content} 
        style={{ 
          backgroundColor: 'transparent',
          color: 'rgb(209 213 219)',
          padding: '1rem'
        }}
      />
    </div>
  );
};

export default MarkdownViewer;