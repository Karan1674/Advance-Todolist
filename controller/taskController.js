import task from "../models/task";

export const addTask = async (req, res) => {
    try {
        const { title, discription, deadline, status, priority, followup } = req.body

        if (!title || !discription || !deadline || !status || !priority || !followup) {
            res.status(404).json({ message: "Every Field is required " });
            return
        }

        const newTask = new task({
            title,
            discription,
            deadline,
            status,
            priority,
            followup
        }
        )

        await newTask.save();
        res.status(200).json({ message: "Task is saved" })

    } catch (error) {
        console.log("Error Occured", error);
        res.status(404).json({message:"Error occured while creating a new task"});
    }
}



export const deleteTask= async(req,res)=>{
  try {
    const taskId= req.params.taskId

    if(!taskId){
        return res.status(404).json({message:"taskId is not available"})
    }

    const task = await task.findById(taskId);

    if(!task){
        return res.status(404).json({message:"Task is not available"});
    }

    await task.deleteOne({ _id: taskId })

    res.status(200).json({message:"Task deleted successfully"});
  } catch (error) {
    console.log("Error",error);
    res.status(404).json({message:"Error Occured While deleting a task"})
  }
}


export const editTask=async(req,res)=>{
    try {
        const taskId= req.params.taskId

        if(!taskId){
            return res.status(404).json({message:"taskId is not available"})
        }
        const { title, discription, deadline, status, priority, followup } = req.body

        const task = await task.findById(taskId);

        if (!task) {
            return res.status(404).json({
                message: "task not found",
                success: false,
            });
        }

        task.title = title;
        task.discription = discription;
        task.deadline=deadline;
        task.status=status;
        task.priority= priority
        task.followup= followup
    


        await task.save();

        return res.status(200).json({
            message: "task updated successfully",
            task,
            success: true,
        });
    } catch (error) {
        console.log("Error",error);
        return res.status(404).json({
            message: "An error occurred while updating the task",
            success: false,
        });
    }
}