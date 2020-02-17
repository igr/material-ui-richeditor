import React, { useCallback, useMemo, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import isHotkey from 'is-hotkey'
import { Slate, Editable, withReact } from 'slate-react'
import { createEditor, Editor, Transforms } from 'slate'
import { withHistory } from 'slate-history'
import { HoveringToolbar } from './components/HoverToolbar'
import { toggleMark } from './components/ToolbarButtons'
import { Toolbar } from './components/Toolbar'
import { CommentElement } from './components/Comments'
import Footnote from './components/Footnote'

// To enable rich text with keys
const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

export default function UEditor({
  value,
  onChangeValue,
  displayToolbar,
  displayHoverToolbar,
  toolbarButtons,
  comments,
  footnotes,
  onChangeComment,
  onChangeFootnote,
  extendRenderElement,
  extendRenderLeaf,
  customToolbarButtons,
  editorId,
  ...props
}) {
  const [initialValue, setValue] = useState(value)
  const renderElement = useCallback(props => Element(props), [
    footnotes,
    comments,
  ])
  const renderLeaf = useCallback(props => Leaf(props), [])

  const editor = useMemo(
    () => withComments(withFootnotes(withHistory(withReact(createEditor())))),
    []
  )

  useEffect(() => {
    const footnotesInEditor = getListByFormat('footnote')
    // If there is difference in footnotes in editor and state
    if (footnotes.length !== footnotesInEditor.length) {
      // Find the removed footnote
      let removedFootnotes = footnotesInEditor.filter(
        obj => !footnotes.some(element => element.id === obj.id)
      )

      // Remove from editor
      removedFootnotes.map(footnote => {
        Transforms.removeNodes(editor, {
          at: [],
          match: n => n.id === footnote.id,
        })
      })
    }
  }, [footnotes])

  useEffect(() => {
    const commentsInEditor = getListByFormat('comment')
    // If there is difference in footnotes in editor and state
    if (comments.length !== commentsInEditor.length) {
      // Find the removed comment
      let removedComments = commentsInEditor.filter(
        obj => !comments.some(element => element.id === obj.id)
      )

      // unwrap from editor
      removedComments.map(comment => {
        Transforms.unwrapNodes(editor, {
          at: [],
          match: n => n.id === comment.id,
        })
      })
    }
  }, [comments])

  // To get list of format exists in editor
  function getListByFormat(format) {
    const list = Editor.nodes(editor, {
      match: n => n.type === format,
      at: [],
    })

    // List in editor with path and node
    const listWithNodesAndPath = Array.from(list)
    // List with node (element)
    const listWithNodes = listWithNodesAndPath.map(item => {
      return item[0]
    })
    return listWithNodes
  }

  // On change value
  function handleChangeValue(value) {
    onChangeValue(value)
    setValue(value)
  }

  // Block level elements
  const Element = ({ attributes, element, children, ...props }) => {
    //on change in footnote
    function handleChangeFootnote(value) {
      onChangeFootnote && onChangeFootnote(value)
    }

    // on change in comment
    function handleChangeComment(value) {
      onChangeComment && onChangeComment(value)
    }

    switch (element.type) {
      case 'block-quote':
        return <blockquote {...attributes}>{children}</blockquote>
      case 'bulleted-list':
        return <ul {...attributes}>{children}</ul>
      case 'heading-one':
        return <h1 {...attributes}>{children}</h1>
      case 'heading-two':
        return <h2 {...attributes}>{children}</h2>
      case 'list-item':
        return <li {...attributes}>{children}</li>
      case 'numbered-list':
        return <ol {...attributes}>{children}</ol>
      case 'comment':
        return (
          <CommentElement
            attributes={attributes}
            comments={comments}
            element={element}
            onChangeComment={value => handleChangeComment(value)}
            {...props}
          >
            {children}
          </CommentElement>
        )
      case 'footnote':
        return (
          <Footnote
            attributes={attributes}
            footnotes={footnotes}
            element={element}
            onChangeFootnote={value => handleChangeFootnote(value)}
            {...props}
          >
            {children}
          </Footnote>
        )
      default:
        return extendRenderElement ? (
          extendRenderElement({ attributes, children, element })
        ) : (
          <p {...attributes}>{children}</p>
        )
    }
  }

  // Leaf inline elements
  const Leaf = ({ attributes, children, leaf }) => {
    if (leaf.bold) {
      children = <strong>{children}</strong>
    }

    if (leaf.code) {
      children = <code>{children}</code>
    }

    if (leaf.italic) {
      children = <em>{children}</em>
    }

    if (leaf.underline) {
      children = <u>{children}</u>
    }

    return extendRenderLeaf ? (
      extendRenderLeaf({ attributes, children, leaf })
    ) : (
      <span {...attributes}>{children}</span>
    )
  }

  // comments to pass to parent
  function handleComment(value) {
    return onChangeComment(value)
  }

  // comments to pass to parent
  function handleChangeFootnote(value) {
    return onChangeFootnote(value)
  }

  return (
    <Slate editor={editor} value={initialValue} onChange={handleChangeValue}>
      {displayHoverToolbar && (
        <HoveringToolbar
          editorId={editorId}
          toolbarButtons={toolbarButtons}
          customToolbarButtons={customToolbarButtons}
          onChangeComment={value => handleComment(value)}
          onChangeFootnote={value => handleChangeFootnote(value)}
        />
      )}
      {displayToolbar && (
        <Toolbar
          editorId={editorId}
          toolbarButtons={toolbarButtons}
          customToolbarButtons={customToolbarButtons}
          onChangeComment={value => handleComment(value)}
          onChangeFootnote={value => handleChangeFootnote(value)}
        />
      )}
      <Editable
        renderElement={props => renderElement(props, footnotes)}
        renderLeaf={renderLeaf}
        onKeyDown={event => {
          for (const hotkey in HOTKEYS) {
            if (isHotkey(hotkey, event)) {
              event.preventDefault()
              const mark = HOTKEYS[hotkey]
              toggleMark(editor, mark)
            }
          }
        }}
        placeholder="Enter some text..."
      />
    </Slate>
  )
}

// PropTypes
UEditor.propTypes = {
  /** unique id of the editor */
  editorId: PropTypes.number,
  /** content to display in the editor*/
  value: PropTypes.arrayOf(PropTypes.object),
  /** on change value */
  onChangeValue: PropTypes.func,
  /** format Buttons to display on toolbar  */
  toolbarButtons: PropTypes.arrayOf(PropTypes.object),
  /** on comment change */
  onChangeComment: PropTypes.func,
  /** on footnote change */
  onChangeFootnote: PropTypes.func,
  /** Hover toolbar */
  displayHoverToolbar: PropTypes.bool,
  /** Toolbar on top of editor*/
  displayToolbar: PropTypes.bool,
  /**To add custom buttons totoolbar */
  customToolbarButtons: PropTypes.fun,
  /** parentRenderLeaf is to add our own inline elements to editor*/
  parentRenderLeaf: PropTypes.func,
  /** parentRenderElement is to add our own block level elements to editor*/
  parentRenderElement: PropTypes.func,
}

// Default props
UEditor.defaultProps = {
  toolbarButtons: [
    { type: 'Mark', format: 'bold' },
    { type: 'Mark', format: 'italic' },
    { type: 'Mark', format: 'underline' },
    { type: 'Mark', format: 'code' },
    { type: 'Block', format: 'bulleted-list' },
    { type: 'Block', format: 'numbered-list' },
    { type: 'Block', format: 'heading-one' },
    { type: 'Block', format: 'heading-two' },
    { type: 'Comment', format: 'comment' },
    { type: 'Footnote', format: 'footnote' },
  ],
  hoveringToolbar: true,
}

// Editor to have comments as inline element
const withComments = editor => {
  const { isInline } = editor

  editor.isInline = element => {
    return element.type === 'comment' ? true : isInline(element)
  }

  return editor
}

// Editor to have footnotes as inline element
const withFootnotes = editor => {
  const { isInline, isVoid, insertText } = editor

  editor.isInline = element => {
    return element.type === 'footnote' ? true : isInline(element)
  }

  editor.isVoid = element => {
    return element.type === 'footnote' ? true : isVoid(element)
  }

  return editor
}
