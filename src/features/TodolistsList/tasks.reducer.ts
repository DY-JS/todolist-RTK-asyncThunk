import { AppThunk } from "app/store";
import { handleServerNetworkError } from "common/utils/handleServerNetworkError";
import { appActions } from "app/app.reducer";
import { todolistsActions } from "features/TodolistsList/todolists.reducer";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { clearTasksAndTodolists } from "common/actions/common.actions";
import { createAppAsyncThunk } from "common/utils/createAppAsyncThunk";
import {
  ArgAddTask,
  ArgUpdateTask,
  TaskType,
  todolistsAPI,
  UpdateTaskModelType,
} from "features/TodolistsList/todolidtsApi";
import { handleServerAppError } from "common/utils";
import { TaskPriorities, TaskStatuses } from "common/enum/enum";

const initialState: TasksStateType = {};

const slice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    removeTask: (state, action: PayloadAction<{ taskId: string; todolistId: string }>) => {
      const tasks = state[action.payload.todolistId];
      const index = tasks.findIndex((t) => t.id === action.payload.taskId);
      if (index !== -1) tasks.splice(index, 1);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state[action.payload.todolistId] = action.payload.tasks;
      })
      .addCase(addTask.fulfilled, (state, action) => {
        const tasks = state[action.payload.task.todoListId];
        tasks.unshift(action.payload.task);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const tasks = state[action.payload.todolistId];
        const index = tasks.findIndex((t) => t.id === action.payload.taskId);
        if (index !== -1) {
          tasks[index] = { ...tasks[index], ...action.payload.domainModel };
        }
      })
        .addCase(removeTask.fulfilled, (state, action) => {
          const tasks = state[action.payload.todolistId];
          const index = tasks.findIndex((t) => t.id === action.payload.taskId);
          if (index !== -1) tasks.splice(index, 1);
        })
      .addCase(todolistsActions.addTodolist, (state, action) => {
        state[action.payload.todolist.id] = [];
      })
      .addCase(todolistsActions.removeTodolist, (state, action) => {
        delete state[action.payload.id];
      })
      .addCase(todolistsActions.setTodolists, (state, action) => {
        action.payload.todolists.forEach((tl) => {
          state[tl.id] = [];
        });
      })
      .addCase(clearTasksAndTodolists, () => {
        return {};
      });
  },
});

// thunks
//в типизации: 1й арг - что возвр  2й арг - что приним
const fetchTasks = createAppAsyncThunk<{ tasks: TaskType[]; todolistId: string }, string>(
  `${slice.name}/fetchTasks`,
  async (todolistId, thunkAPI) => {
    const { dispatch, rejectWithValue } = thunkAPI;
    try {
      dispatch(appActions.setAppStatus({ status: "loading" }));
      const res = await todolistsAPI.getTasks(todolistId);
      dispatch(appActions.setAppStatus({ status: "succeeded" }));
      return { tasks: res.data.items, todolistId };  //это payload
    } catch (error) {
      handleServerNetworkError(error, dispatch);
      return rejectWithValue(null);
    }
  }
);

const ResultCode2 = {
  success: 0,
  error: 1,
  captcha: 10,
} as const;

enum ResultCodeEnum {
  success = 0,
  error = 1,
  captcha = 10,
}

let ResultCode = {
  success: 0,
  error: 1,
  captcha: 10,
} as const;

// type ResultCodeType = typeof ResultCode
type ResultCodeType2 = (typeof ResultCode)[keyof typeof ResultCode];

function foo(a: ResultCodeEnum) {
  // code
}

foo(ResultCode.error);
foo(0);
foo(12);

// ResultCodeEnum.success = 100;

//type ArgAddTask = { todolistId: string; title: string }; - это arg
const addTask = createAppAsyncThunk<{ task: TaskType }, ArgAddTask>(`${slice.name}/addTask`,
    async (arg, thunkAPI) => {
  const { dispatch, rejectWithValue } = thunkAPI;
  try {
    dispatch(appActions.setAppStatus({ status: "loading" }));
    const res = await todolistsAPI.createTask(arg);//arg.todolistId, arg.title
    if (res.data.resultCode === ResultCode.success) {
      const task = res.data.data.item;
      dispatch(appActions.setAppStatus({ status: "succeeded" }));
      return { task };   //обязательно return (payload)
    } else {
      handleServerAppError(res.data, dispatch);
      return rejectWithValue(null);   //обязательно return
    }
  } catch (error) {
    handleServerNetworkError(error, dispatch);
    return rejectWithValue(null);  //обязательно return
  }
});

const removeTask = createAppAsyncThunk<{taskId: string, todolistId: string}, {taskId: string, todolistId: string}>(`${slice.name}/removeTask`,
    async (arg, thunkAPI) => {
      const { dispatch, rejectWithValue } = thunkAPI;
      try {
        dispatch(appActions.setAppStatus({ status: "loading" }));
        const res = await todolistsAPI.deleteTask(arg.todolistId, arg.taskId);
        if (res.data.resultCode === ResultCode.success) {
          dispatch(appActions.setAppStatus({ status: "succeeded" }));
          return {todolistId: arg.todolistId, taskId: arg.taskId };   //обязательно return payload для addCase
        } else {
          handleServerAppError(res.data, dispatch);
          return rejectWithValue(null);   //обязательно return
        }
      } catch (error) {
        handleServerNetworkError(error, dispatch);
        return rejectWithValue(null);  //обязательно return
      }
    })

const updateTask = createAppAsyncThunk<ArgUpdateTask, ArgUpdateTask>(
  `${slice.name}/updateTask`,
  async (arg, thunkAPI) => {
    const { dispatch, rejectWithValue, getState } = thunkAPI;
    try {
      const state = getState();
      const task = state.tasks[arg.todolistId].find((t) => t.id === arg.taskId);
      if (!task) {
        return rejectWithValue(null);
      }

      const apiModel: UpdateTaskModelType = {
        deadline: task.deadline,
        description: task.description,
        priority: task.priority,
        startDate: task.startDate,
        title: task.title,
        status: task.status,
        ...arg.domainModel,
      };

      const res = await todolistsAPI.updateTask(arg.todolistId, arg.taskId, apiModel);

      if (res.data.resultCode === 0) {
        return arg;  //обязательно return (payload)
      } else {
        handleServerAppError(res.data, dispatch);
        return rejectWithValue(null);
      }
    } catch (error) {
      handleServerNetworkError(error, dispatch);
      return rejectWithValue(null);
    }
  }
);

// types
export type UpdateDomainTaskModelType = {
  title?: string;
  description?: string;
  status?: TaskStatuses;
  priority?: TaskPriorities;
  startDate?: string;
  deadline?: string;
};
export type TasksStateType = {
  [key: string]: Array<TaskType>;
};

export const tasksReducer = slice.reducer;
export const tasksActions = slice.actions;
export const tasksThunks = { fetchTasks, addTask, updateTask, removeTask };
