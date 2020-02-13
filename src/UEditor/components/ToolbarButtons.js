import React from 'react'
import { Transforms, Editor, Range } from 'slate'
import { useSlate } from 'slate-react'
import { Button } from './sharedComponents'
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatQuote,
  FormatListBulleted,
  FormatListNumbered,
} from '@material-ui/icons'
import AddCommentIcon from '@material-ui/icons/AddComment'
import CodeIcon from '@material-ui/icons/Code'
import ListIcon from '@material-ui/icons/List'
import LooksOne from '@material-ui/icons/LooksOne'
import LooksTwo from '@material-ui/icons/LooksTwo'
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd'
import getDateAndTime from './getDateAndTime'

const LIST_TYPES = ['numbered-list', 'bulleted-list']

export const ToolbarButtons = ({
  toolbarButtons,
  customToolbarButtons,
  onChangeComment,
  ...props
}) => {
  // On Change in comment
  function handleComments(value) {
    return onChangeComment(value)
  }

  // Returns toolbar buttons based on the type and format
  return (
    <React.Fragment>
      {toolbarButtons.map(({ type, format, icon }) => {
        switch (type) {
          case 'Mark':
            return (
              <MarkButton key={format} format={format}>
                {icon ? icon : <Icon format={format} />}
              </MarkButton>
            )
          case 'Block':
            return (
              <BlockButton key={format} format={format}>
                {icon ? icon : <Icon format={format} />}
              </BlockButton>
            )
          case 'Comment':
            return (
              <CommentButton
                key={'comment'}
                format="comment"
                onChangeComment={value => handleComments(value)}
                {...props}
              >
                <AddCommentIcon />
              </CommentButton>
            )
          case 'Footnote':
            return (
              <FootnoteButton key={'footnote'} format="footnote" {...props}>
                <PlaylistAddIcon />
              </FootnoteButton>
            )
        }
      })}
      {customToolbarButtons}
    </React.Fragment>
  )
}

// Icons of toolbar buttons
const Icon = ({ format }) => {
  switch (format) {
    case 'bold':
      return <FormatBold />
    case 'code':
      return <CodeIcon />
    case 'italic':
      return <FormatItalic />
    case 'underline':
      return <FormatUnderlined />
    case 'block-quote':
      return <FormatQuote />
    case 'bulleted-list':
      return <FormatListBulleted />
    case 'heading-one':
      return <LooksOne />
    case 'heading-two':
      return <LooksTwo />
    case 'list-item':
      return <ListIcon />
    case 'numbered-list':
      return <FormatListNumbered />
    default:
      return
  }
}

// Some of the constants are resuable so it is exported to use in other components

//Block Button
export const BlockButton = ({ format, children }) => {
  const editor = useSlate()

  return (
    <Button
      active={isBlockActive(editor, format)}
      onMouseDown={event => {
        event.preventDefault()
        toggleBlock(editor, format)
      }}
    >
      {children}
    </Button>
  )
}

// Toggle Block
export const toggleBlock = (editor, format) => {
  const isActive = isBlockActive(editor, format)
  const isList = LIST_TYPES.includes(format)

  Transforms.unwrapNodes(editor, {
    match: n => LIST_TYPES.includes(n.type),
    split: true,
  })

  Transforms.setNodes(editor, {
    type: isActive ? 'paragraph' : isList ? 'list-item' : format,
  })

  if (!isActive && isList) {
    const block = { type: format, children: [] }
    Transforms.wrapNodes(editor, block)
  }
}

// To check block is active or not
export const isBlockActive = (editor, format) => {
  const [match] = Editor.nodes(editor, {
    match: n => n.type === format,
  })

  return !!match
}

// To add or remove Mark
export const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format)

  if (isActive) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

// To check wether mark is active
export const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor)
  return marks ? marks[format] === true : false
}

// Mark Button
export const MarkButton = ({ format, children }) => {
  const editor = useSlate()

  return (
    <Button
      active={isMarkActive(editor, format)}
      onMouseDown={event => {
        event.preventDefault()
        toggleMark(editor, format)
      }}
    >
      {children}
    </Button>
  )
}

// Comments
const insertComment = (editor, url, format, comment) => {
  if (editor.selection) {
    wrapComment(editor, url, format, comment)
  }
}

// Wrap the comment
export const wrapComment = (editor, commentText, format, comment) => {
  if (isFormatActive(editor, format)) {
    unwrapFormat(editor, format)
  }

  const { selection } = editor
  const isCollapsed = selection && Range.isCollapsed(selection)

  comment.type = 'comment'
  comment.children = isCollapsed ? [{ text: commentText }] : []

  if (isCollapsed) {
    Transforms.insertNodes(editor, comment)
  } else {
    Transforms.wrapNodes(editor, comment, { split: true })
    Transforms.collapse(editor, { edge: 'end' })
  }
}

//comment button
const CommentButton = ({ format, children, editorId, onChangeComment }) => {
  const editor = useSlate()

  function handleComments(value) {
    return onChangeComment && onChangeComment(value)
  }
  return (
    <Button
      active={isFormatActive(editor, format)}
      onMouseDown={event => {
        event.preventDefault()
        const commentText = window.prompt('Enter the comment')
        if (!commentText) return
        const comment = {
          id: getDateAndTime(new Date(), 'timestamp'),
          editorId: editorId,
          commentText,
          time: getDateAndTime(new Date(), 'time'),
        }
        handleComments(comment)
        insertComment(editor, commentText, format, comment)
      }}
    >
      {children}
    </Button>
  )
}

// To unwrap node with format
export const unwrapFormat = (editor, format) => {
  Transforms.unwrapNodes(editor, { match: n => n.type === format })
}

// To check active status of nodes by format
const isFormatActive = (editor, format) => {
  const [active] = Editor.nodes(editor, { match: n => n.type === format })
  return !!active
}

// Footnotes
const insertFootnote = (editor, text, format) => {
  if (editor.selection) {
    wrapFootnote(editor, text, format)
  }
}

// To wrap footnote nodes
export const wrapFootnote = (editor, footnoteText, format) => {
  if (isFormatActive(editor, format)) {
    unwrapFormat(editor, format)
  }

  const { selection } = editor
  const isCollapsed = selection && Range.isCollapsed(selection)
  const footnote = {
    type: 'footnote',
    id: getDateAndTime(new Date(), 'timestamp'),
    footnoteText,
    time: getDateAndTime(new Date(), 'time'),
    children: isCollapsed ? [{ text: footnoteText }] : [],
  }

  if (isCollapsed) {
    Transforms.insertNodes(editor, footnote)
  } else {
    Transforms.wrapNodes(editor, footnote, { split: true })
    Transforms.collapse(editor, { edge: 'end' })
  }
}

//Footnote button
const FootnoteButton = ({ format, children }) => {
  const editor = useSlate()
  return (
    <Button
      active={isFormatActive(editor, format)}
      onMouseDown={event => {
        event.preventDefault()
        const text = window.prompt('Enter the URL of the link:')
        if (!text) return
        insertFootnote(editor, text, format)
      }}
    >
      {children}
    </Button>
  )
}