import Navbar from './Components/Navbar'
import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { FaEdit } from "react-icons/fa"
import { AiFillDelete } from "react-icons/ai"

function App() {
  const [todo, setTodo] = useState('')
  const [quantity, setQuantity] = useState('')
  const [estimated, setEstimated] = useState('')
  const [todos, setTodos] = useState([])
  const [showFinished, setshowFinished] = useState(true)

  // Load from localStorage
  useEffect(() => {
    let todoString = localStorage.getItem('todos')
    if (todoString) {
      let todos = JSON.parse(todoString)
      setTodos(todos)
    }
  }, [])

  const SaveToLS = (newTodos) => {
    localStorage.setItem('todos', JSON.stringify(newTodos))
  }

  const toggledFinished = () => {
    setshowFinished(!showFinished)
  }

  const handleAdd = () => {
    if (!todo.trim() || !quantity.trim() || !estimated.trim()) return

    const estTotal = parseFloat(quantity) * parseFloat(estimated)

    let newTodos = [...todos, {
      id: uuidv4(),
      todo,
      quantity: parseFloat(quantity),
      estimatedRate: parseFloat(estimated),
      estimatedAmount: estTotal,
      realAmount: null,
      difference: null,
      isCompleted: false
    }]
    setTodos(newTodos)
    SaveToLS(newTodos)

    // reset fields
    setTodo('')
    setQuantity('')
    setEstimated('')
  }

  const handleChange = (e) => setTodo(e.target.value)
  const handleQuantityChange = (e) => setQuantity(e.target.value)
  const handleEstimatedChange = (e) => setEstimated(e.target.value)

  const handleCheckbox = (e) => {
    let id = e.target.name
    let index = todos.findIndex(item => item.id === id)
    let newTodos = [...todos]

    // Toggle completion
    newTodos[index].isCompleted = !newTodos[index].isCompleted

    // If marking completed → ask for real amount
    if (newTodos[index].isCompleted) {
      let realAmount = prompt("Enter Real Total Amount:")
      if (realAmount !== null && realAmount !== '') {
        realAmount = parseFloat(realAmount)
        newTodos[index].realAmount = realAmount
        newTodos[index].difference = newTodos[index].estimatedAmount - realAmount
      }
    } else {
      // Reset when unchecked
      newTodos[index].realAmount = null
      newTodos[index].difference = null
    }

    setTodos(newTodos)
    SaveToLS(newTodos)
  }

  const handleEdit = (e, id) => {
    let t = todos.filter(i => i.id === id)[0]
    setTodo(t.todo)
    setQuantity(t.quantity)
    setEstimated(t.estimatedRate)
    let newTodos = todos.filter(item => item.id !== id)
    setTodos(newTodos)
    SaveToLS(newTodos)
  }

  const handleDelete = (e, id) => {
    let newTodos = todos.filter(item => item.id !== id)
    setTodos(newTodos)
    SaveToLS(newTodos)
  }

  // Grand totals calculation
  const totalEstimated = todos.reduce((acc, t) => acc + (t.estimatedAmount || 0), 0)
  const totalReal = todos.reduce((acc, t) => acc + (t.realAmount || 0), 0)
  const totalDiff = todos.reduce((acc, t) => acc + (t.difference || 0), 0)

  return (
    <>
      <Navbar />
      <div className="mx-3 md:container md:mx-auto my-5 rounded-xl p-5 bg-violet-200 min-h-[80vh]">
        <h1 className='font-bold text-center text-3xl'>iTask - Manage your todos at one place</h1>

        {/* ADD TODO SECTION */}
        <div className="addTodo my-5 grid grid-cols-2 gap-3 items-center">
          <h2 className="text-xl font-bold">Add a Todo</h2>
          <input
            onChange={handleChange}
            value={todo}
            type="text"
            placeholder="Enter task name"
            className='bg-white rounded-lg px-5 py-1 border w-3/4 focus:outline-none focus:ring-1 focus:ring-blue-500'
          />

          <h2 className="text-xl font-bold">Quantity</h2>
          <input
            onChange={handleQuantityChange}
            value={quantity}
            type="number"
            placeholder="Enter quantity"
            className='bg-white rounded-lg px-5 py-1 border w-3/4 focus:outline-none focus:ring-1 focus:ring-blue-500'
          />

          <h2 className="text-xl font-bold">Estimated Rate</h2>
          <input
            onChange={handleEstimatedChange}
            value={estimated}
            type="number"
            placeholder="Enter estimated rate"
            className='bg-white rounded-lg px-5 py-1 border w-3/4 focus:outline-none focus:ring-1 focus:ring-blue-500'
          />

          <button
            onClick={handleAdd}
            disabled={todo.length <= 3 || !estimated || !quantity}
            className='bg-violet-500 hover:bg-violet-600 disabled:bg-violet-300 p-2 text-bold text-xl font-bold text-white rounded-md col-span-2 w-full'
          >
            Save
          </button>
        </div>

        {/* TOGGLE FINISHED */}
        <div>
          <input className='my-4' onChange={toggledFinished} type="checkbox" checked={showFinished} />
          <label className='mx-2'>Show Finished</label>
        </div>

        <div className="h-[1px] opacity-25 w-[90%] mx-auto my-2 bg-black"></div>

        {/* TODOS LIST */}
        <h2 className='text-xl font-bold'>My Todos</h2>
        <div className="todos">
          {todos.length === 0 && <div className='m-5'>No Todos to Display</div>}

          {todos.map(item => {
            return (showFinished || !item.isCompleted) && (
              <div key={item.id} className="todo flex flex-col bg-white shadow-md rounded-lg p-3 my-3 md:w-3/4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <input name={item.id} onChange={handleCheckbox} type="checkbox" checked={item.isCompleted} />
                    <div className={item.isCompleted ? "line-through" : ""}>
                      {item.todo} ({item.quantity})
                    </div>
                  </div>

                  <div className="buttons flex">
                    <button onClick={(e) => handleEdit(e, item.id)} className='bg-violet-500 hover:bg-violet-600 p-2 text-sm text-white rounded-md mx-1'><FaEdit /></button>
                    <button onClick={(e) => handleDelete(e, item.id)} className='bg-violet-500 hover:bg-violet-600 p-2 text-sm text-white rounded-md mx-1'><AiFillDelete /></button>
                  </div>
                </div>

                {/* Amount Details in one line */}
                <div className="flex justify-between text-sm mt-2 text-gray-800">
                  <p>Est. Amount: <span className="font-semibold">${item.estimatedAmount?.toFixed(2) ?? '-'}</span></p>
                  <p>Real: <span className="font-semibold">${item.realAmount?.toFixed(2) ?? '-'}</span></p>
                  <p>Diff: <span className={`font-semibold ${item.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.difference !== null ? `$${item.difference.toFixed(2)}` : '-'}
                  </span></p>
                </div>
              </div>
            )
          })}
        </div>

        {/* GRAND TOTAL SECTION */}
        {todos.length > 0 && (
          <div className="bg-white p-4 mt-6 rounded-lg shadow-lg md:w-3/4">
            <h2 className="text-xl font-bold mb-2 text-center">Grand Totals</h2>
            <div className="flex justify-between font-semibold">
              <p>Total Estimated: ${totalEstimated.toFixed(2)}</p>
              <p>Total Real: ${totalReal.toFixed(2)}</p>
              <p>Total Difference: 
                <span className={`ml-1 ${totalDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${totalDiff.toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default App
