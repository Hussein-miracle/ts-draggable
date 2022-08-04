//Drag and Drop interfaces

interface Draggable{
  dragStartHandler(e:DragEvent): void;
  dragEndHandler(e:DragEvent):void;
}

interface DragTarget{
  dragOverHandler(e:DragEvent):void;
  dropHandler(e:DragEvent):void;
  dragLeaveHandler(e:DragEvent):void;
}


enum ProjectStatus {
  Active,
  Finished,
}

// console.log(ProjectStatus);
//Project Class;
class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public status: ProjectStatus
  ) {}
}



type Listener<T>= (items: T[]) => void;

class State<T> {
  protected listeners: Listener<T>[] = [];
  addListener(listener: Listener<T>) {
    this.listeners.push(listener);
  }
}
//PROJECT STATE MANAGEMENT
class ProjectState  extends State<Project>{

  private projects: Project[] = [];
  private static instance: ProjectState;

  private constructor() {
    super();
  }

  static getInstance() {
    if (this.instance) {
      return this.instance;
    }
    this.instance = new ProjectState();

    return this.instance;
  }

  addProject(title: string, description: string, numOfPeople: number) {
    const newProject = new Project(
      Math.random().toString(),
      title,
      description,
      numOfPeople,
      ProjectStatus.Active
    );

    this.projects.push(newProject);

    this.updateListeners();
  }



  moveProject(projectId:string,newStatus:ProjectStatus){
    const project = this.projects.find((p) => p.id === projectId);

    if(project && project.status !== newStatus){
      project.status = newStatus;
      this.updateListeners();
    }
  }


  private updateListeners():void{
    for (const listener of this.listeners) {
      listener(this.projects.slice());
    }
  }
}

const projectState = ProjectState.getInstance();

interface Validateable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}
function validate(validateableInput: Validateable) {
  let isValid = true;

  if (validateableInput.required) {
    isValid = isValid && validateableInput.value.toString().trim().length !== 0;
  }

  if (
    validateableInput.minLength != null &&
    typeof validateableInput.value === "string"
  ) {
    isValid =
      isValid && validateableInput.value.length > validateableInput.minLength;
  }
  if (
    validateableInput.maxLength != null &&
    typeof validateableInput.value === "string"
  ) {
    isValid =
      isValid && validateableInput.value.length < validateableInput.maxLength;
  }

  if (
    validateableInput.min != null &&
    typeof validateableInput.value === "number"
  ) {
    isValid = isValid && validateableInput.value >= validateableInput.min;
  }
  if (
    validateableInput.max != null &&
    typeof validateableInput.value === "number"
  ) {
    isValid = isValid && validateableInput.value <= validateableInput.max;
  }

  return isValid;
}

//Autobind decorator
function AutoBind(
  _target: any,
  _methodName: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  const adjustedDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundFn = originalMethod.bind(this);
      return boundFn;
    },
  };

  return adjustedDescriptor;
}

//Component Base Class
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateEl: HTMLTemplateElement;
  hostEl: T;
  element: U;

  constructor(
    templateId: string,
    hostElementId: string,
    insertAtStart: boolean,
    newElementId?: string
  ) {
    this.templateEl = document.getElementById(
      templateId
    )! as HTMLTemplateElement;
    this.hostEl = document.getElementById(hostElementId)! as T;
    const importedNode = document.importNode(this.templateEl.content, true);

    this.element = importedNode.firstElementChild! as U;
    if (newElementId) {
      this.element.id = newElementId;
    }

    this.attach(insertAtStart);
  }

  private attach(atStart: boolean) {
    this.hostEl.insertAdjacentElement(
      atStart ? "afterbegin" : "beforeend",
      this.element
    );
  }

  abstract configure?(): void;
  abstract renderContent(): void;
}


class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable{
  private project: Project;


  get persons():string | void{

    if(+this.project.people === 1){
      return  `1 person`;
    }

    if(+this.project.people > 1){
      return `${this.project.people} persons`;
    }

 
  }
  constructor(hostId:string,project:Project) {
    super("single-project", hostId, !false,project.id);
    this.project = project;


    this.configure()
    this.renderContent();
  }
  @AutoBind
  dragStartHandler(e: DragEvent): void {
    console.log("dragStart");
    e.dataTransfer!?.setData("text/plain",this.project.id);
    e.dataTransfer!.effectAllowed = "move";
  }

  @AutoBind
  dragEndHandler(_e: DragEvent): void {
    console.log("dragEnd");
  }

  configure(){
    this.element.addEventListener("dragstart",this.dragStartHandler);
    this.element.addEventListener("dragend",this.dragEndHandler);
  }

  renderContent(): void {
   
    this.element.querySelector("h2")!.textContent = this.project.title;
    this.element.querySelector("h3")!.textContent = this.persons + ` assigned`;
    this.element.querySelector("p")!.textContent = this.project.description;

  }
}
//PROJECT LIST CLASS

class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget{
  assignedProjects: Project[];

  constructor(private type: "active" | "finished") {
    super("project-list", "app", false, `${type}-projects`);
    this.assignedProjects = [];

    this.configure();
    this.renderContent();
  }
  @AutoBind
  dragOverHandler(e: DragEvent): void {
    // console.log("dragover");
    if(e.dataTransfer! && e.dataTransfer.types[0] === "text/plain"){
      e.preventDefault();
      const listEl = this.element.querySelector("ul")!;
      listEl.classList.add("droppable");
    }
    
    
  }
  @AutoBind
  dropHandler(e: DragEvent): void {
    const projId = e.dataTransfer!.getData("text/plain");
    projectState.moveProject(projId,this.type === "active" ? ProjectStatus.Active : ProjectStatus.Finished);
  }

  @AutoBind
  dragLeaveHandler(_e: DragEvent): void {
    // console.log("dragLeave");
    const listEl = this.element.querySelector("ul")!;

    listEl.classList.remove("droppable");
  }

  private renderProjects() {
    const listEl = document.getElementById(
      `${this.type}-projects-list`
    )! as HTMLUListElement;


    listEl.innerHTML = "";

    for (const projectItem of this.assignedProjects) {
      new ProjectItem(this.element.querySelector("ul")!.id,projectItem);
      // listEl.appendChild(listItem);
    }
  }

  configure(): void {
    this.element.addEventListener("dragover",this.dragOverHandler);
    this.element.addEventListener("dragleave",this.dragLeaveHandler);
    this.element.addEventListener("drop",this.dropHandler);
    projectState.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter((prj) => {
        if (this.type === "active") {
          return prj.status === ProjectStatus.Active;
        }

        return prj.status === ProjectStatus.Finished;
      });
      this.assignedProjects = relevantProjects;
      this.renderProjects();
    });
  }

  renderContent() {
    const listId = `${this.type}-projects-list`;
    this.element.querySelector("ul")!.id = listId;
    this.element.querySelector("h2")!.textContent =
      this.type.toUpperCase() + "PROJECTS";
  }

  // private attach() {
  //   this.hostEl.insertAdjacentElement("beforeend", this.element);
  // }
}

//PROJECTINPUT CLASS;
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleInputElement: HTMLInputElement;
  descriptionInputElement: HTMLInputElement;
  peopleInputElement: HTMLInputElement;
  constructor() {
    super("project-input", "app", true, "user-input");

    this.titleInputElement = this.element.querySelector(
      "#title"
    ) as HTMLInputElement;

    this.descriptionInputElement = this.element.querySelector(
      "#description"
    ) as HTMLInputElement;

    this.peopleInputElement = this.element.querySelector(
      "#people"
    ) as HTMLInputElement;
    this.configure();
  }

  public configure() {
    this.element.addEventListener("submit", this.submitHandler);
  }

  private getUserInputs(): [string, string, number] | void {
    const enteredTitle = this.titleInputElement.value;
    const enteredDesc = this.descriptionInputElement.value;
    const enteredNumOfPeople = this.peopleInputElement.value;

    const titleValidatable: Validateable = {
      value: enteredTitle,
      required: true,
    };

    const descValidatable: Validateable = {
      value: enteredDesc,
      required: true,
      minLength: 3,
    };
    const peopleValidatable: Validateable = {
      value: +enteredNumOfPeople,
      required: true,
      min: 1,
      max: 5,
    };

    const isEnteredTitleCorrect: Boolean = validate(titleValidatable);
    const isEnteredDescCorrect: Boolean = validate(descValidatable);
    const isEnteredPeopleCorrect: Boolean = validate(peopleValidatable);

    if (
      !isEnteredDescCorrect ||
      !isEnteredPeopleCorrect ||
      !isEnteredTitleCorrect
    ) {
      alert("Invalid inputs");
      return;
    } else {
      return [enteredTitle, enteredDesc, +enteredNumOfPeople];
    }

    //
    // if (
    //   !(isEnteredDescCorrect && isEnteredPeopleCorrect && isEnteredTitleCorrect)
    // ) {
    //   alert("Invalid inputs");
    //   return;
    // } else {
    //   return [enteredTitle, enteredDesc, +enteredNumOfPeople];
    // }
  }

  private clearInputs(): void {
    this.titleInputElement.value = "";
    this.descriptionInputElement.value = "";
    this.peopleInputElement.value = "";
  }

  @AutoBind
  private submitHandler(event: Event) {
    event.preventDefault();
    const userInput = this.getUserInputs();
    if (Array.isArray(userInput)) {
      const [title, desc, people] = userInput;
      // console.log(title);
      // console.log(desc);
      // console.log(people);
      projectState.addProject(title, desc, people);
      this.clearInputs();
    }
  }


  renderContent(): void {
    
  }
}

const projectInput = new ProjectInput();
const activeProjectList = new ProjectList("active");
const finishedProjectList = new ProjectList("finished");
