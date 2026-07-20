import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";

const prisma = new PrismaClient();

const buildSelect = (level: any, topLevel: any): any => {
  if (level === 0) {
    if (topLevel == 0) {
      return {
        horse_id: true,
        name: true,
        birthyear: true,
        color: true,
        predicates: true,
        remarks: true,
        remarks_short: true,

        has_disciplines: {
          select: {
            disciplines: {
              select: {
                value: true,
                priority: true,
                short: true
              }
            } // This will include the related disciplinesvalues
          }
        },
        lineage_dam: true,
        breederid: true,
        breeders: true
      };
    }
    return {
      select: {
        horse_id: true,
        name: true,
        birthyear: true,
        color: true,
        predicates: true,
        remarks: true,
        remarks_short: true,

        has_disciplines: {
          select: {
            disciplines: {
              select: {
                value: true,
                priority: true,
                short: true
              }
            } // This will include the related disciplinesvalues
          }
        },
        sire: {
          select: {
            name: true
          }
        },
        breeders: {
          select: {
            id: true,
            breedername: true,
            addr1: true,
            tel: true,
            email: true,
            website: true,
            mapref: true,
            logo: true,
            farmname: true
          }
        },
        lineage_dam: {
          select: {
            horse_id: true,
            name: true,
            birthyear: true,
            color: true,
            predicates: true,
            remarks: true,
            remarks_short: true,

            has_disciplines: {
              select: {
                disciplines: {
                  select: {
                    value: true,
                    priority: true,
                    short: true
                  }
                } // This will include the related disciplinesvalues
              }
            },
            dam_id: true,
            sire: {
              select: {
                name: true
              }
            },
            breeders: {
              select: {
                id: true,
                breedername: true,
                addr1: true,
                tel: true,
                email: true,
                website: true,
                mapref: true,
                logo: true,
                farmname: true
              }
            },
            lineage_dam: {
              select: {
                horse_id: true,
                name: true,
                birthyear: true,
                color: true,
                predicates: true,
                remarks: true,
                remarks_short: true,

                has_disciplines: {
                  select: {
                    disciplines: {
                      select: {
                        value: true,
                        priority: true,
                        short: true
                      }
                    } // This will include the related disciplinesvalues
                  }
                },
                dam_id: true,
                sire: {
                  select: {
                    name: true
                  }
                },
                breeders: {
                  select: {
                    id: true,
                    breedername: true,
                    addr1: true,
                    tel: true,
                    email: true,
                    website: true,
                    mapref: true,
                    logo: true,
                    farmname: true
                  }
                },
                lineage_dam: {
                  select: {
                    horse_id: true,
                    name: true,
                    birthyear: true,
                    color: true,
                    predicates: true,
                    remarks: true,
                    remarks_short: true,

                    has_disciplines: {
                      select: {
                        disciplines: {
                          select: {
                            value: true,
                            priority: true,
                            short: true
                          }
                        } // This will include the related disciplinesvalues
                      }
                    },
                    dam_id: true,
                    sire: {
                      select: {
                        name: true
                      }
                    },
                    breeders: {
                      select: {
                        id: true,
                        breedername: true,
                        addr1: true,
                        tel: true,
                        email: true,
                        website: true,
                        mapref: true,
                        logo: true,
                        farmname: true
                      }
                    },
                    lineage_dam: {
                      select: {
                        horse_id: true,
                        name: true,
                        birthyear: true,
                        color: true,
                        predicates: true,
                        remarks: true,
                        remarks_short: true,

                        has_disciplines: {
                          select: {
                            disciplines: {
                              select: {
                                value: true,
                                priority: true,
                                short: true
                              }
                            } // This will include the related disciplinesvalues
                          }
                        },
                        dam_id: true,
                        sire: {
                          select: {
                            name: true
                          }
                        },
                        breeders: {
                          select: {
                            id: true,
                            breedername: true,
                            addr1: true,
                            tel: true,
                            email: true,
                            website: true,
                            mapref: true,
                            logo: true,
                            farmname: true
                          }
                        },
                        lineage_dam: {
                          select: {
                            horse_id: true,
                            name: true,
                            birthyear: true,
                            color: true,
                            predicates: true,
                            remarks: true,
                            remarks_short: true,

                            has_disciplines: {
                              select: {
                                disciplines: {
                                  select: {
                                    value: true,
                                    priority: true,
                                    short: true
                                  }
                                } // This will include the related disciplinesvalues
                              }
                            },
                            dam_id: true,
                            sire: {
                              select: {
                                name: true
                              }
                            },
                            breeders: {
                              select: {
                                id: true,
                                breedername: true,
                                addr1: true,
                                tel: true,
                                email: true,
                                website: true,
                                mapref: true,
                                logo: true,
                                farmname: true
                              }
                            }
                          },
                          where: {
                            status: 1
                          },
                          orderBy: {
                            birthyear: "asc"
                          }
                        }
                      },
                      where: {
                        status: 1
                      },
                      orderBy: {
                        birthyear: "asc"
                      }
                    }
                  },
                  where: {
                    status: 1
                  },
                  orderBy: {
                    birthyear: "asc"
                  }
                }
              },
              where: {
                status: 1
              },
              orderBy: {
                birthyear: "asc"
              }
            }
          },
          where: {
            status: 1
          },
          orderBy: {
            birthyear: "asc"
          }
        },
        breederid: true
      }
    };
  }
  if (level === topLevel) {
    return {
      name: true,
      birthyear: true,
      color: true,
      predicates: true,
      remarks: true,
      remarks_short: true,

      has_disciplines: {
        select: {
          disciplines: {
            select: {
              value: true,
              priority: true,
              short: true
            }
          } // This will include the related disciplinesvalues
        }
      },
      horse_id: true,
      breederid: true,
      sire: {
        select: {
          name: true
        }
      },
      dam: buildSelect(level - 1, topLevel)
    };
  } else {
    return {
      select: {
        horse_id: true,
        name: true,
        birthyear: true,
        color: true,
        predicates: true,
        remarks: true,
        remarks_short: true,

        has_disciplines: {
          select: {
            disciplines: {
              select: {
                value: true,
                priority: true,
                short: true
              }
            } // This will include the related disciplinesvalues
          }
        },
        sire: {
          select: {
            name: true
          }
        },
        dam: buildSelect(level - 1, topLevel)
      }
    };
  }
};

async function findFirstAncestor(id: any, level = 0) {
  // Retrieve the horse record with the specified dam_id and status of 1

  const storeHorse = await prisma.storehorse.findFirst({
    select: {
      dam_id: true,
      horse_id: true,
      dam: {
        select: {
          dam_id: true,
          horse_id: true,
          status: true
        },
        where: {
          status: 1,
          horse_id: {
            gt: 0, // dam_id greater than 0
            not: {
              equals: id // dam_id should not be equal to the current id
            }
          }
        }
      }
    },
    where: {
      horse_id: id, // Convert to number if necessary
      status: 1 // Only consider active horses
    }
  });
  // Check if the horse has a dam (parent)
  if (!storeHorse) {
    return --level;
  }

  // Validate the dam_id
  if (storeHorse?.dam === null || level == 4) {
    return level; // Found the top-level dam (first ancestor)
  }

  // Otherwise, recursively call to find the ancestor
  return await findFirstAncestor(storeHorse.dam_id, ++level); // Recursive call
}

function convertToArray(idString: any) {
  // Check if the string is empty or undefined
  if (!idString) {
    return [];
  }

  // Split the string by commas and trim any whitespace around each element
  return idString.split(",").map((id: any) => Number(id));
}

// @ts-ignore
export default defineEventHandler(async (event) => {
  await validateApiKey(event);
  try {
    // @ts-ignore1
    const body = await readBody(event);

    // Set your desired recursion level here

    if (!body.level || !body.id) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" })
      };
    }

    let ids = convertToArray(body.id);
    const data = [];
    for (let i = 0; i < ids.length; i++) {
      const level = await findFirstAncestor(ids[i]);
      let select = buildSelect(level, level);
      const apiResponse = await prisma.storehorse.findMany({
        select: select,
        where: {
          horse_id: ids[i],
          status: 1
        },
        orderBy: {
          birthyear: "asc"
        }
      });
      // @ts-ignore1
      data.push(apiResponse); // Use spread operator to append array elements
    }
    return {
      status: 200,
      // body:JSON.stringify(apiResponse),
      body: JSON.stringify(data)
      // body:data
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      status: 500,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  } finally {
    await prisma.$disconnect();
  }
});
